import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
  const [
    totalMembers,
    totalCfContests,
    totalCfSubmissions,
    totalCfAccepted,
    totalCsesProblems,
    totalCsesSubmissions,
    totalCsesAccepted,
    recentSyncLogs,
  ] = await Promise.all([
    prisma.teamMember.count(),
    prisma.cfContest.count(),
    prisma.cfSubmission.count(),
    prisma.cfSubmission.count({ where: { verdict: "OK" } }),
    prisma.csesProblem.count({ where: { submissions: { some: {} } } }),
    prisma.csesSubmission.count(),
    prisma.csesSubmission.count({ where: { verdict: { contains: "ACCEPTED" } } }),
    prisma.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
  ]);

  const recentCfSubmissions = await prisma.cfSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      member: { select: { name: true, codeforcesHandle: true } },
      problem: { select: { name: true, problemIndex: true, contestId: true } },
      contest: { select: { name: true } },
    },
  });

  const members = await prisma.teamMember.findMany({
    include: {
      _count: {
        select: {
          cfSubmissions: true,
          csesSubmissions: true,
        },
      },
    },
  });

  const memberStats = await Promise.all(
    members.map(async (m) => {
      const cfAccepted = await prisma.cfSubmission.count({
        where: { memberId: m.id, verdict: "OK" },
      });
      const csesAccepted = await prisma.csesSubmission.count({
        where: { memberId: m.id, verdict: { contains: "ACCEPTED" } },
      });
      return {
        name: m.name,
        codeforcesHandle: m.codeforcesHandle,
        csesUsername: m.csesUsername,
        cfSubmissions: m._count.cfSubmissions,
        cfAccepted,
        csesSubmissions: m._count.csesSubmissions,
        csesAccepted,
      };
    })
  );

  return NextResponse.json({
    team: {
      name: "Cooperativa los Trapitos",
      memberCount: totalMembers,
    },
    codeforces: {
      contests: totalCfContests,
      submissions: totalCfSubmissions,
      accepted: totalCfAccepted,
      acceptRate: totalCfSubmissions > 0
        ? Math.round((totalCfAccepted / totalCfSubmissions) * 100)
        : 0,
    },
    cses: {
      problemsAttempted: totalCsesProblems,
      submissions: totalCsesSubmissions,
      accepted: totalCsesAccepted,
      acceptRate: totalCsesSubmissions > 0
        ? Math.round((totalCsesAccepted / totalCsesSubmissions) * 100)
        : 0,
    },
    members: memberStats,
    recentActivity: recentCfSubmissions,
    recentSyncLogs,
  });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const errName = error instanceof Error ? error.constructor.name : "Unknown";
    return NextResponse.json({ error: message, type: errName }, { status: 500 });
  }
}
