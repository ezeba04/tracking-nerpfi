import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const { contestId } = await params;
  const id = parseInt(contestId, 10);

  const contest = await prisma.cfContest.findUnique({
    where: { id },
    include: {
      problems: {
        orderBy: { problemIndex: "asc" },
      },
    },
  });

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  // Get submissions grouped by problem
  const problemsWithSubmissions = await Promise.all(
    contest.problems.map(async (problem) => {
      const submissions = await prisma.cfSubmission.findMany({
        where: { problemId: problem.id },
        include: {
          member: { select: { id: true, name: true, codeforcesHandle: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const hasSolvedInContest = submissions.some(
        (s) => s.verdict === "OK" && s.isDuringContest
      );
      const hasSolvedUpsolving = submissions.some(
        (s) => s.verdict === "OK" && !s.isDuringContest
      );

      return {
        ...problem,
        tags: problem.tags ? JSON.parse(problem.tags) : [],
        status: hasSolvedInContest
          ? "solved_in_contest"
          : hasSolvedUpsolving
          ? "upsolved"
          : submissions.length > 0
          ? "attempted"
          : "unsolved",
        submissions: submissions.map((s) => ({
          ...s,
          sourceCode: undefined, // Don't send source code in list view
        })),
        submissionCount: submissions.length,
        membersSolved: [
          ...new Set(
            submissions.filter((s) => s.verdict === "OK").map((s) => s.member.name)
          ),
        ],
      };
    })
  );

  return NextResponse.json({
    contest,
    problems: problemsWithSubmissions,
  });
}
