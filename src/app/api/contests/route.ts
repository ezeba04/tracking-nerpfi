import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const contests = await prisma.cfContest.findMany({
    orderBy: { startTime: "desc" },
    include: {
      problems: {
        orderBy: { problemIndex: "asc" },
      },
      _count: {
        select: { submissions: true },
      },
    },
  });

  // For each contest, compute summary stats
  const contestsWithStats = await Promise.all(
    contests.map(async (contest) => {
      // Get unique problems solved (with AC verdict) during contest and upsolving
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

      // Get participating members
      const participants = await prisma.cfSubmission.findMany({
        where: { contestId: contest.id },
        select: {
          member: { select: { id: true, name: true, codeforcesHandle: true } },
        },
        distinct: ["memberId"],
      });

      return {
        ...contest,
        solvedInContest: solvedDuringContest.length,
        solvedUpsolving: solvedUpsolving.length,
        totalSubmissions: contest._count.submissions,
        participants: participants.map((p) => p.member),
      };
    })
  );

  return NextResponse.json(contestsWithStats);
}
