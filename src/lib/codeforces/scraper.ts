/**
 * Codeforces Source Code Scraper
 *
 * The CF API doesn't provide source code, so we need to scrape it
 * from the website. This requires login with session cookies.
 *
 * Flow:
 * 1. GET /enter → extract CSRF token
 * 2. POST /enter → login with credentials + CSRF
 * 3. GET /contest/{id}/submission/{subId} → extract source code
 */

import * as cheerio from "cheerio";

const CF_BASE = "https://codeforces.com";
const SCRAPE_DELAY_MS = 3000; // 3 seconds between scrape requests

let sessionCookies: string[] = [];
let isLoggedIn = false;

function getCookieHeader(): string {
  return sessionCookies.join("; ");
}

function extractCookies(response: Response): void {
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  for (const cookie of setCookieHeaders) {
    const cookieName = cookie.split("=")[0];
    // Replace existing cookie or add new one
    sessionCookies = sessionCookies.filter(
      (c) => !c.startsWith(cookieName + "=")
    );
    sessionCookies.push(cookie.split(";")[0]);
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Login to Codeforces and establish a session
 */
export async function loginToCodeforces(
  username: string,
  password: string
): Promise<boolean> {
  try {
    // Step 1: GET login page to get CSRF token and cookies
    const loginPageResponse = await fetch(`${CF_BASE}/enter`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "manual",
    });

    extractCookies(loginPageResponse);

    const loginPageHtml = await loginPageResponse.text();
    const $ = cheerio.load(loginPageHtml);
    const csrfToken = $('input[name="csrf_token"]').val() as string;
    const ftaa = $('input[name="ftaa"]').val() as string;
    const bfaa = $('input[name="bfaa"]').val() as string;

    if (!csrfToken) {
      console.error("Could not extract CSRF token from Codeforces login page");
      return false;
    }

    // Step 2: POST login
    const formData = new URLSearchParams();
    formData.append("csrf_token", csrfToken);
    formData.append("action", "enter");
    formData.append("ftaa", ftaa || "");
    formData.append("bfaa", bfaa || "");
    formData.append("handleOrEmail", username);
    formData.append("password", password);
    formData.append("_tta", "176");
    formData.append("remember", "on");

    const loginResponse = await fetch(`${CF_BASE}/enter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: getCookieHeader(),
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${CF_BASE}/enter`,
      },
      body: formData.toString(),
      redirect: "manual",
    });

    extractCookies(loginResponse);

    // Check if login was successful (302 redirect to home)
    if (loginResponse.status === 302 || loginResponse.status === 301) {
      isLoggedIn = true;
      console.log("Successfully logged in to Codeforces");
      return true;
    }

    // Check response body for error
    const responseText = await loginResponse.text();
    if (responseText.includes("Invalid handle/email or password")) {
      console.error("Invalid Codeforces credentials");
      return false;
    }

    // Sometimes CF returns 200 but the login worked (check for logout link)
    if (responseText.includes("/logout")) {
      isLoggedIn = true;
      console.log("Successfully logged in to Codeforces (200 response)");
      return true;
    }

    console.error(
      "Codeforces login failed with status:",
      loginResponse.status
    );
    return false;
  } catch (error) {
    console.error("Codeforces login error:", error);
    return false;
  }
}

/**
 * Scrape source code from a specific submission page
 */
export async function scrapeSubmissionCode(
  contestId: number,
  submissionId: number
): Promise<string | null> {
  if (!isLoggedIn) {
    const username = process.env.CF_USERNAME;
    const password = process.env.CF_PASSWORD;
    if (!username || !password) {
      console.error("CF_USERNAME and CF_PASSWORD are required for scraping");
      return null;
    }
    const loginSuccess = await loginToCodeforces(username, password);
    if (!loginSuccess) return null;
  }

  await delay(SCRAPE_DELAY_MS);

  try {
    const url = `${CF_BASE}/contest/${contestId}/submission/${submissionId}`;
    const response = await fetch(url, {
      headers: {
        Cookie: getCookieHeader(),
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch submission ${submissionId}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Source code is inside #program-source-text element
    const sourceCode = $("#program-source-text").text();

    if (!sourceCode) {
      // Try alternative selector
      const altCode = $("pre#program-source-text").text();
      if (altCode) return altCode;

      // Try another common pattern
      const codeBlock = $(".source-code").text();
      if (codeBlock) return codeBlock;

      console.warn(`No source code found for submission ${submissionId}`);
      return null;
    }

    return sourceCode;
  } catch (error) {
    console.error(`Error scraping submission ${submissionId}:`, error);
    return null;
  }
}

/**
 * Batch scrape source code for multiple submissions
 * Returns a map of submissionId → sourceCode
 */
export async function batchScrapeSubmissionCode(
  submissions: Array<{ contestId: number; submissionId: number }>
): Promise<Map<number, string>> {
  const results = new Map<number, string>();

  for (const sub of submissions) {
    const code = await scrapeSubmissionCode(sub.contestId, sub.submissionId);
    if (code) {
      results.set(sub.submissionId, code);
    }
  }

  return results;
}

/**
 * Reset the login session (useful if cookies expire)
 */
export function resetSession(): void {
  sessionCookies = [];
  isLoggedIn = false;
}
