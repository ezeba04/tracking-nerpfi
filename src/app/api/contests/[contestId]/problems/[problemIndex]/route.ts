import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string; problemIndex: string }> }
) {
  const { contestId, problemIndex } = await params;
  const cId = parseInt(contestId, 10);

  const problem = await prisma.cfProblem.findUnique({
    where: {
      contestId_problemIndex: {
        contestId: cId,
        problemIndex: problemIndex.toUpperCase(),
      },
    },
  });

  if (!problem) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  const contest = await prisma.cfContest.findUnique({
    where: { id: cId },
  });

  // Get all submissions with full source code
  const submissions = await prisma.cfSubmission.findMany({
    where: { problemId: problem.id },
    include: {
      member: { select: { id: true, name: true, codeforcesHandle: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    problem: {
      ...problem,
      tags: problem.tags ? JSON.parse(problem.tags) : [],
    },
    contest,
    submissions,
  });
}
