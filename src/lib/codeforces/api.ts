/**
 * Codeforces API Client
 * Uses the public Codeforces API — no authentication needed for these endpoints.
 * Rate limited to 1 request per 2 seconds to be respectful.
 */

const CF_API_BASE = "https://codeforces.com/api";
const RATE_LIMIT_MS = 2000;
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Codeforces API error: ${response.status} ${response.statusText}`);
  }
  return response;
}

// ─── Types matching Codeforces API response ─────────────

export interface CfApiProblem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  rating?: number;
  tags: string[];
}

export interface CfApiPartyMember {
  handle: string;
}

export interface CfApiParty {
  contestId?: number;
  members: CfApiPartyMember[];
  participantType: string; // CONTESTANT, PRACTICE, VIRTUAL, etc.
  teamId?: number;
  teamName?: string;
  ghost: boolean;
  startTimeSeconds?: number;
}

export interface CfApiSubmission {
  id: number;
  contestId?: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: CfApiProblem;
  author: CfApiParty;
  programmingLanguage: string;
  verdict?: string;
  testset: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

export interface CfApiContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds?: number;
  relativeTimeSeconds?: number;
}

interface CfApiResponse<T> {
  status: string;
  result: T;
  comment?: string;
}

// ─── API Methods ────────────────────────────────────────

/**
 * Get all submissions for a user
 */
export async function fetchUserSubmissions(
  handle: string,
  from?: number,
  count?: number
): Promise<CfApiSubmission[]> {
  let url = `${CF_API_BASE}/user.status?handle=${handle}`;
  if (from !== undefined) url += `&from=${from}`;
  if (count !== undefined) url += `&count=${count}`;

  const response = await rateLimitedFetch(url);
  const data: CfApiResponse<CfApiSubmission[]> = await response.json();

  if (data.status !== "OK") {
    throw new Error(`CF API error: ${data.comment || "Unknown error"}`);
  }
  return data.result;
}

/**
 * Get submissions for a specific contest (optionally filtered by handle)
 */
export async function fetchContestSubmissions(
  contestId: number,
  handle?: string
): Promise<CfApiSubmission[]> {
  let url = `${CF_API_BASE}/contest.status?contestId=${contestId}`;
  if (handle) url += `&handle=${handle}`;

  const response = await rateLimitedFetch(url);
  const data: CfApiResponse<CfApiSubmission[]> = await response.json();

  if (data.status !== "OK") {
    throw new Error(`CF API error: ${data.comment || "Unknown error"}`);
  }
  return data.result;
}

/**
 * Get full list of contests from Codeforces
 */
export async function fetchContestList(): Promise<CfApiContest[]> {
  const response = await rateLimitedFetch(`${CF_API_BASE}/contest.list`);
  const data: CfApiResponse<CfApiContest[]> = await response.json();

  if (data.status !== "OK") {
    throw new Error(`CF API error: ${data.comment || "Unknown error"}`);
  }
  return data.result;
}

/**
 * Get user info (to validate handles)
 */
export async function fetchUserInfo(handles: string[]): Promise<unknown[]> {
  const url = `${CF_API_BASE}/user.info?handles=${handles.join(";")}`;
  const response = await rateLimitedFetch(url);
  const data: CfApiResponse<unknown[]> = await response.json();

  if (data.status !== "OK") {
    throw new Error(`CF API error: ${data.comment || "Unknown error"}`);
  }
  return data.result;
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Determine if a submission was made during contest time
 */
export function isDuringContest(
  submission: CfApiSubmission,
  contestDurationSeconds: number
): boolean {
  // relativeTimeSeconds > contestDuration means it was an upsolve
  return submission.relativeTimeSeconds <= contestDurationSeconds;
}

/**
 * Map a Codeforces verdict string to a human-readable label
 */
export function verdictLabel(verdict?: string): string {
  const map: Record<string, string> = {
    OK: "Accepted",
    WRONG_ANSWER: "Wrong Answer",
    TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
    MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
    RUNTIME_ERROR: "Runtime Error",
    COMPILATION_ERROR: "Compilation Error",
    CHALLENGED: "Challenged",
    SKIPPED: "Skipped",
    TESTING: "Testing",
    REJECTED: "Rejected",
    CRASHED: "Crashed",
    INPUT_PREPARATION_CRASHED: "Input Preparation Crashed",
    PRESENTATION_ERROR: "Presentation Error",
    IDLENESS_LIMIT_EXCEEDED: "Idleness Limit Exceeded",
    SECURITY_VIOLATED: "Security Violated",
    PARTIAL: "Partial",
  };
  return verdict ? map[verdict] || verdict : "Unknown";
}
