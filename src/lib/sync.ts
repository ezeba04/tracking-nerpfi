/**
 * Sync Orchestrator
 *
 * Handles incremental sync for both Codeforces and CSES.
 * Only fetches data we don't already have:
 * - New submissions (by checking IDs against DB)
 * - Source code for submissions that don't have it yet
 */

import prisma from "@/lib/db";
import {
  fetchUserSubmissions,
  fetchContestList,
  isDuringContest,
  type CfApiSubmission,
  type CfApiContest,
} from "@/lib/codeforces/api";
import {
  scrapeSubmissionCode,
  batchScrapeSubmissionCode,
  resetSession as resetCfSession,
} from "@/lib/codeforces/scraper";
import {
  scrapeProblems as scrapeCsesProblems,
  scrapeSubmissionDetail,
  scrapeSubmissionsForTask,
  scrapeUserAllSubmissions,
  loginAs as csesLoginAs,
  resetSession as resetCsesSession,
} from "@/lib/cses/scraper";
import { getTeamMembers } from "@/lib/team";

export interface SyncProgress {
  platform: "codeforces" | "cses";
  status: "running" | "completed" | "error";
  message: string;
  current: number;
  total: number;
}

type ProgressCallback = (progress: SyncProgress) => void;

// ─── Codeforces Sync ────────────────────────────────────

export async function syncCodeforces(
  onProgress?: ProgressCallback
): Promise<{ newSubmissions: number; newContests: number }> {
  const members = getTeamMembers();
  if (members.length === 0) {
    throw new Error("No team members configured");
  }

  // Ensure team members exist in DB
  const memberMap = new Map<string, number>(); // cf handle → db id
  for (const member of members) {
    if (!member.cf) continue;
    const dbMember = await prisma.teamMember.upsert({
      where: { codeforcesHandle: member.cf },
      update: { name: member.name, csesUsername: member.cses, csesUserId: member.csesId },
      create: {
        name: member.name,
        codeforcesHandle: member.cf,
        csesUsername: member.cses,
        csesUserId: member.csesId,
      },
    });
    memberMap.set(member.cf.toLowerCase(), dbMember.id);
  }

  onProgress?.({
    platform: "codeforces",
    status: "running",
    message: "Fetching contest list...",
    current: 0,
    total: 0,
  });

  // Fetch all contests to get duration info
  const allContests = await fetchContestList();
  const contestMap = new Map<number, CfApiContest>();
  for (const contest of allContests) {
    contestMap.set(contest.id, contest);
  }

  let totalNewSubmissions = 0;
  let totalNewContests = 0;

  // For each team member, fetch their submissions
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    if (!member.cf) continue;

    onProgress?.({
      platform: "codeforces",
      status: "running",
      message: `Fetching submissions for ${member.name} (${member.cf})...`,
      current: i + 1,
      total: members.length,
    });

    try {
      const submissions = await fetchUserSubmissions(member.cf);
      const memberId = memberMap.get(member.cf.toLowerCase())!;

      // Get ALL existing submission IDs (global, not per-member, since team submissions share IDs)
      const existingIds = new Set(
        (
          await prisma.cfSubmission.findMany({
            where: { id: { in: submissions.map((s) => s.id) } },
            select: { id: true },
          })
        ).map((s) => s.id)
      );

      const newSubmissions = submissions.filter((s) => !existingIds.has(s.id));

      if (newSubmissions.length === 0) {
        onProgress?.({
          platform: "codeforces",
          status: "running",
          message: `No new submissions for ${member.name}`,
          current: i + 1,
          total: members.length,
        });
        continue;
      }

      // Process new submissions
      for (const sub of newSubmissions) {
        if (!sub.contestId) continue;

        const contest = contestMap.get(sub.contestId);
        if (!contest) continue;

        const startTime = contest.startTimeSeconds || 0;

        await prisma.cfContest.upsert({
          where: { id: contest.id },
          update: {},
          create: {
            id: contest.id,
            name: contest.name,
            startTime,
            durationSeconds: contest.durationSeconds,
            type: contest.type,
            phase: contest.phase,
          },
        });

        // Upsert problem
        const problemUrl = `https://codeforces.com/contest/${sub.contestId}/problem/${sub.problem.index}`;
        let problem = await prisma.cfProblem.findUnique({
          where: {
            contestId_problemIndex: {
              contestId: sub.contestId,
              problemIndex: sub.problem.index,
            },
          },
        });

        if (!problem) {
          problem = await prisma.cfProblem.create({
            data: {
              contestId: sub.contestId,
              problemIndex: sub.problem.index,
              name: sub.problem.name,
              rating: sub.problem.rating || null,
              tags: JSON.stringify(sub.problem.tags || []),
              url: problemUrl,
            },
          });
        }

        // Create submission
        const duringContest = isDuringContest(sub, contest.durationSeconds);
        await prisma.cfSubmission.create({
          data: {
            id: sub.id,
            contestId: sub.contestId,
            problemId: problem.id,
            memberId,
            verdict: sub.verdict || "UNKNOWN",
            timeMs: sub.timeConsumedMillis,
            memoryBytes: sub.memoryConsumedBytes,
            language: sub.programmingLanguage,
            passedTests: sub.passedTestCount,
            createdAt: sub.creationTimeSeconds,
            relativeTime: sub.relativeTimeSeconds,
            isDuringContest: duringContest,
            sourceCode: null, // Will be scraped separately
          },
        });

        totalNewSubmissions++;
      }

      // Count new contests
      const memberContestIds = new Set(newSubmissions.map((s) => s.contestId).filter(Boolean));
      totalNewContests += memberContestIds.size;

    } catch (error) {
      console.error(`Error syncing submissions for ${member.cf}:`, error);
      onProgress?.({
        platform: "codeforces",
        status: "running",
        message: `Error syncing ${member.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        current: i + 1,
        total: members.length,
      });
    }
  }

  onProgress?.({
    platform: "codeforces",
    status: "completed",
    message: `Synced ${totalNewSubmissions} new submissions across ${totalNewContests} contests`,
    current: members.length,
    total: members.length,
  });

  return { newSubmissions: totalNewSubmissions, newContests: totalNewContests };
}

// ─── Codeforces Source Code Sync ────────────────────────

/**
 * Scrape source code for submissions that don't have it yet.
 * This is separated from the main sync because it's much slower (scraping).
 */
export async function syncCodeforcesSourceCode(
  onProgress?: ProgressCallback
): Promise<number> {
  const submissionsWithoutCode = await prisma.cfSubmission.findMany({
    where: { sourceCode: null },
    select: { id: true, contestId: true },
    orderBy: { createdAt: "desc" },
  });

  if (submissionsWithoutCode.length === 0) {
    onProgress?.({
      platform: "codeforces",
      status: "completed",
      message: "All submissions already have source code",
      current: 0,
      total: 0,
    });
    return 0;
  }

  // Codeforces uses Cloudflare protection which blocks server-side fetch().
  // Source code must be scraped locally with a real browser (Puppeteer).
  // Run: npx tsx scrape-cf-code.ts
  onProgress?.({
    platform: "codeforces",
    status: "completed",
    message: `${submissionsWithoutCode.length} submissions sin código. CF usa Cloudflare — ejecutá 'npx tsx scrape-cf-code.ts' localmente.`,
    current: 0,
    total: submissionsWithoutCode.length,
  });

  return 0;
}

// ─── CSES Sync ──────────────────────────────────────────

export async function syncCses(
  onProgress?: ProgressCallback
): Promise<{ newSubmissions: number; newProblems: number }> {
  const members = getTeamMembers();
  if (members.length === 0) {
    throw new Error("No team members configured");
  }

  // Find first member with CSES credentials to scrape the problem list
  const firstCsesMember = members.find((m) => m.cses && m.csesPass);
  if (!firstCsesMember) {
    throw new Error("No team members have CSES credentials (cses + csesPass)");
  }

  onProgress?.({
    platform: "cses",
    status: "running",
    message: "Logging in to CSES to fetch problem list...",
    current: 0,
    total: 0,
  });

  // Login as first member to scrape the problem list (it's the same for everyone)
  const loginOk = await csesLoginAs(firstCsesMember.cses, firstCsesMember.csesPass);
  if (!loginOk) {
    throw new Error(`Failed to login to CSES as ${firstCsesMember.cses}`);
  }

  // Scrape all CSES problems
  const problems = await scrapeCsesProblems();
  let newProblems = 0;

  for (const prob of problems) {
    const existing = await prisma.csesProblem.findUnique({
      where: { csesId: prob.csesId },
    });
    if (!existing) {
      await prisma.csesProblem.create({
        data: {
          csesId: prob.csesId,
          name: prob.name,
          category: prob.category,
          url: prob.url,
        },
      });
      newProblems++;
    }
  }

  let totalNewSubmissions = 0;

  // For each member, LOGIN AS THEM and scrape their submissions
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    if (!member.cses || !member.csesId || !member.csesPass) {
      onProgress?.({
        platform: "cses",
        status: "running",
        message: `Skipping ${member.name} — missing CSES credentials (cses/csesPass/csesId)`,
        current: i + 1,
        total: members.length,
      });
      continue;
    }

    // Login as this specific member
    onProgress?.({
      platform: "cses",
      status: "running",
      message: `Logging in to CSES as ${member.name} (${member.cses})...`,
      current: i + 1,
      total: members.length,
    });

    const memberLoginOk = await csesLoginAs(member.cses, member.csesPass);
    if (!memberLoginOk) {
      onProgress?.({
        platform: "cses",
        status: "running",
        message: `❌ Failed to login to CSES as ${member.name}. Skipping.`,
        current: i + 1,
        total: members.length,
      });
      continue;
    }

    const dbMember = await prisma.teamMember.upsert({
      where: { csesUsername: member.cses },
      update: { name: member.name },
      create: {
        name: member.name,
        codeforcesHandle: member.cf || null,
        csesUsername: member.cses,
        csesUserId: member.csesId,
      },
    });

    onProgress?.({
      platform: "cses",
      status: "running",
      message: `Scraping submissions for ${member.name}...`,
      current: i + 1,
      total: members.length,
    });

    try {
      const attemptedProblems = await scrapeUserAllSubmissions(member.csesId);

      onProgress?.({
        platform: "cses",
        status: "running",
        message: `${member.name}: ${attemptedProblems.length} problemas intentados, scrapeando submissions...`,
        current: i + 1,
        total: members.length,
      });

      for (const { problemId: probId } of attemptedProblems) {
        const submissionIds = await scrapeSubmissionsForTask(probId);

        for (const subId of submissionIds) {
          const existing = await prisma.csesSubmission.findUnique({
            where: { csesSubmissionId: subId },
          });
          if (existing) continue;

          const detail = await scrapeSubmissionDetail(subId);
          if (!detail) continue;

          const dbProblem = await prisma.csesProblem.findUnique({
            where: { csesId: detail.problemId || probId },
          });
          if (!dbProblem) continue;

          await prisma.csesSubmission.create({
            data: {
              csesSubmissionId: subId,
              problemId: dbProblem.id,
              memberId: dbMember.id,
              verdict: detail.verdict,
              timeMs: detail.timeMs,
              memoryKb: detail.memoryKb,
              language: detail.language,
              createdAt: detail.createdAt,
              sourceCode: detail.sourceCode,
            },
          });

          totalNewSubmissions++;
        }
      }
    } catch (error) {
      console.error(`Error scraping CSES for ${member.name}:`, error);
      onProgress?.({
        platform: "cses",
        status: "running",
        message: `Error scraping ${member.name}: ${error instanceof Error ? error.message : "Unknown"}`,
        current: i + 1,
        total: members.length,
      });
    }
  }

  onProgress?.({
    platform: "cses",
    status: "completed",
    message: `Synced ${totalNewSubmissions} new CSES submissions`,
    current: members.length,
    total: members.length,
  });

  return { newSubmissions: totalNewSubmissions, newProblems };
}

// ─── Full Sync ──────────────────────────────────────────

export async function syncAll(onProgress?: ProgressCallback) {
  // Log sync start
  const syncLog = await prisma.syncLog.create({
    data: {
      platform: "all",
      status: "running",
      message: "Starting full sync...",
    },
  });

  try {
    // 1. Sync Codeforces metadata (fast — API)
    const cfResult = await syncCodeforces(onProgress);

    // 2. Sync Codeforces source code (slow — scraping)
    const cfCodeCount = await syncCodeforcesSourceCode(onProgress);

    // 3. Sync CSES (scraping)
    const csesResult = await syncCses(onProgress);

    // Update log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        endedAt: new Date(),
        message: `CF: ${cfResult.newSubmissions} subs, ${cfCodeCount} codes. CSES: ${csesResult.newSubmissions} subs.`,
        newItems:
          cfResult.newSubmissions + cfCodeCount + csesResult.newSubmissions,
      },
    });

    return {
      codeforces: cfResult,
      codeforcesCode: cfCodeCount,
      cses: csesResult,
    };
  } catch (error) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "error",
        endedAt: new Date(),
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}
