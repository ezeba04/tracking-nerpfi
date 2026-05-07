/**
 * CSES Scraper
 *
 * CSES has no public API, so everything is scraped.
 * Uses HTTP requests with session cookies (no headless browser needed).
 *
 * Flow:
 * 1. GET /login → extract CSRF token
 * 2. POST /login → authenticate
 * 3. GET /problemset/list → scrape problem list
 * 4. GET /problemset/result/{id} → scrape submission detail + code
 */

import * as cheerio from "cheerio";

const CSES_BASE = "https://cses.fi";
const SCRAPE_DELAY_MS = 2000;

let sessionCookies: string[] = [];
let isLoggedIn = false;

function getCookieHeader(): string {
  return sessionCookies.join("; ");
}

function extractCookies(response: Response): void {
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  for (const cookie of setCookieHeaders) {
    const cookieName = cookie.split("=")[0];
    sessionCookies = sessionCookies.filter(
      (c) => !c.startsWith(cookieName + "=")
    );
    sessionCookies.push(cookie.split(";")[0]);
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Types ──────────────────────────────────────────────

export interface CsesProblemInfo {
  csesId: string;
  name: string;
  category: string;
  url: string;
}

export interface CsesSubmissionInfo {
  csesSubmissionId: string;
  problemId: string; // cses problem id
  verdict: string;
  timeMs: number | null;
  memoryKb: number | null;
  language: string | null;
  createdAt: string | null;
  sourceCode: string | null;
}

// ─── Auth ───────────────────────────────────────────────

export async function loginToCses(
  username: string,
  password: string
): Promise<boolean> {
  try {
    // Step 1: GET login page for CSRF
    const loginPageResponse = await fetch(`${CSES_BASE}/login`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    extractCookies(loginPageResponse);

    const loginHtml = await loginPageResponse.text();
    const $ = cheerio.load(loginHtml);
    const csrfToken = $('input[name="csrf_token"]').val() as string;

    if (!csrfToken) {
      console.error("Could not extract CSRF token from CSES");
      return false;
    }

    // Step 2: POST login
    const formData = new URLSearchParams();
    formData.append("csrf_token", csrfToken);
    formData.append("nick", username);
    formData.append("pass", password);

    const loginResponse = await fetch(`${CSES_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: getCookieHeader(),
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${CSES_BASE}/login`,
      },
      body: formData.toString(),
      redirect: "manual",
    });

    extractCookies(loginResponse);

    // CSES redirects on successful login
    if (loginResponse.status === 302 || loginResponse.status === 301) {
      isLoggedIn = true;
      console.log(`Successfully logged in to CSES as ${username}`);
      return true;
    }

    const responseText = await loginResponse.text();
    if (responseText.includes("Log out") || responseText.includes("logout")) {
      isLoggedIn = true;
      return true;
    }

    console.error(`CSES login failed for user: ${username}`);
    return false;
  } catch (error) {
    console.error("CSES login error:", error);
    return false;
  }
}

/**
 * Login as a specific member. Resets the current session first.
 * Call this before scraping each member's submissions.
 */
export async function loginAs(
  username: string,
  password: string
): Promise<boolean> {
  resetSession();
  return loginToCses(username, password);
}

// ─── Scrape Problems ────────────────────────────────────

/**
 * Scrape the CSES problem list with categories
 */
export async function scrapeProblems(): Promise<CsesProblemInfo[]> {
  if (!isLoggedIn) throw new Error("Must be logged in to CSES before scraping. Call loginAs() first.");
  await delay(SCRAPE_DELAY_MS);

  const response = await fetch(`${CSES_BASE}/problemset/list`, {
    headers: {
      Cookie: getCookieHeader(),
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);
  const problems: CsesProblemInfo[] = [];

  let currentCategory = "Unknown";

  $(".content h2, .content .task-list a").each((_, el) => {
    if (el.tagName === "h2") {
      currentCategory = $(el).text().trim();
    } else {
      const href = $(el).attr("href") || "";
      const match = href.match(/\/problemset\/task\/(\d+)/);
      if (match) {
        problems.push({
          csesId: match[1],
          name: $(el).text().trim(),
          category: currentCategory,
          url: `${CSES_BASE}${href}`,
        });
      }
    }
  });

  return problems;
}

// ─── Scrape User Submissions ────────────────────────────

/**
 * Get submission IDs for a specific problem by a user
 */
export async function scrapeUserSubmissionsForProblem(
  csesUserId: string,
  csesProblemId: string
): Promise<string[]> {
  if (!isLoggedIn) throw new Error("Must be logged in to CSES before scraping. Call loginAs() first.");
  await delay(SCRAPE_DELAY_MS);

  // Navigate to the user's submissions for this problem
  const url = `${CSES_BASE}/problemset/result/${csesProblemId}/?user=${csesUserId}`;
  const response = await fetch(url, {
    headers: {
      Cookie: getCookieHeader(),
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);
  const submissionIds: string[] = [];

  // Look for submission links in the results table
  $("table a, .content a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/\/problemset\/result\/(\d+)/);
    if (match && !submissionIds.includes(match[1])) {
      submissionIds.push(match[1]);
    }
  });

  return submissionIds;
}

/**
 * Scrape all submissions for a user across all attempted problems
 */
export async function scrapeUserAllSubmissions(
  csesUserId: string
): Promise<Array<{ problemId: string; submissionIds: string[] }>> {
  if (!isLoggedIn) throw new Error("Must be logged in to CSES before scraping. Call loginAs() first.");
  await delay(SCRAPE_DELAY_MS);

  // Go to user page to find attempted problems
  const response = await fetch(`${CSES_BASE}/user/${csesUserId}`, {
    headers: {
      Cookie: getCookieHeader(),
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  const problemSubmissions: Array<{
    problemId: string;
    submissionIds: string[];
  }> = [];

  // Find links to problem results
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/\/problemset\/task\/(\d+)/);
    if (match) {
      const classes = $(el).attr("class") || "";
      // Only include attempted problems (have a class indicating status)
      if (classes.includes("full") || classes.includes("zero") || classes.includes("task-score")) {
        problemSubmissions.push({
          problemId: match[1],
          submissionIds: [], // will be filled by individual problem scraping
        });
      }
    }
  });

  return problemSubmissions;
}

// ─── Scrape Submission Detail ───────────────────────────

/**
 * Scrape a specific submission for details and source code
 */
export async function scrapeSubmissionDetail(
  submissionId: string
): Promise<CsesSubmissionInfo | null> {
  if (!isLoggedIn) throw new Error("Must be logged in to CSES before scraping. Call loginAs() first.");
  await delay(SCRAPE_DELAY_MS);

  try {
    const url = `${CSES_BASE}/problemset/result/${submissionId}`;
    const response = await fetch(url, {
      headers: {
        Cookie: getCookieHeader(),
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch CSES submission ${submissionId}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract problem ID from breadcrumbs or links
    let problemId = "";
    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const match = href.match(/\/problemset\/task\/(\d+)/);
      if (match) problemId = match[1];
    });

    // Extract verdict
    const verdict = $(".verdict, .result-text").first().text().trim() || "Unknown";

    // Extract time and memory from the detail table
    let timeMs: number | null = null;
    let memoryKb: number | null = null;
    let language: string | null = null;
    let createdAt: string | null = null;

    $("table tr, .info-table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim().toLowerCase();
        const value = $(cells[1]).text().trim();

        if (label.includes("time") || label.includes("tiempo")) {
          const timeMatch = value.match(/([\d.]+)\s*s/);
          if (timeMatch) timeMs = Math.round(parseFloat(timeMatch[1]) * 1000);
        }
        if (label.includes("memory") || label.includes("memoria")) {
          const memMatch = value.match(/([\d.]+)/);
          if (memMatch) memoryKb = Math.round(parseFloat(memMatch[1]));
        }
        if (label.includes("language") || label.includes("lenguaje")) {
          language = value;
        }
        if (label.includes("time") && label.includes("submit")) {
          createdAt = value;
        }
      }
    });

    // Extract source code
    const sourceCode = $("pre.linenums").text() ||
      $("pre.source-code").text() ||
      $("pre").filter((_, el) => {
        const text = $(el).text();
        return text.includes("#include") || text.includes("import") || text.includes("def ") || text.includes("int main");
      }).first().text() || null;

    return {
      csesSubmissionId: submissionId,
      problemId,
      verdict,
      timeMs,
      memoryKb,
      language,
      createdAt,
      sourceCode,
    };
  } catch (error) {
    console.error(`Error scraping CSES submission ${submissionId}:`, error);
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────────

export function resetSession(): void {
  sessionCookies = [];
  isLoggedIn = false;
}
