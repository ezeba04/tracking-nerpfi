import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const contests = await prisma.cfContest.findMany({
    include: {
      problems: {
        orderBy: { problemIndex: "asc" },
      },
      _count: {
        select: { submissions: true },
      },
    },
  });

  const contestsWithStats = await Promise.all(
    contests.map(async (contest) => {
      const solvedDuringContest = await prisma.cfSubmission.findMany({
        where: {
          contestId: contest.id,
          verdict: "OK",
          isDuringContest: true,
        },
        select: { problemId: true, memberId: true },
        distinct: ["problemId"],
      });

      const solvedUpsolving = await prisma.cfSubmission.findMany({
        where: {
          contestId: contest.id,
          verdict: "OK",
          isDuringContest: false,
        },
        select: { problemId: true, memberId: true },
        distinct: ["problemId"],
      });

      const participants = await prisma.cfSubmission.findMany({
        where: { contestId: contest.id },
        select: {
          member: { select: { id: true, name: true, codeforcesHandle: true } },
        },
        distinct: ["memberId"],
      });

      const lastSubmission = await prisma.cfSubmission.findFirst({
        where: { contestId: contest.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      return {
        ...contest,
        solvedInContest: solvedDuringContest.length,
        solvedUpsolving: solvedUpsolving.length,
        totalSubmissions: contest._count.submissions,
        participants: participants.map((p) => p.member),
        lastActivity: lastSubmission?.createdAt ?? contest.startTime,
      };
    })
  );

  contestsWithStats.sort((a, b) => b.lastActivity - a.lastActivity);

  return NextResponse.json(contestsWithStats);
}
