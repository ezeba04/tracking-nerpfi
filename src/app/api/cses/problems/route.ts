import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const problems = await prisma.csesProblem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { submissions: true },
      },
    },
  });

  // Get solve status per problem
  const problemsWithStatus = await Promise.all(
    problems.map(async (problem) => {
      const acceptedSubmissions = await prisma.csesSubmission.findMany({
        where: {
          problemId: problem.id,
          verdict: { contains: "ACCEPTED" },
        },
        include: {
          member: { select: { name: true } },
        },
        distinct: ["memberId"],
      });

      return {
        ...problem,
        totalSubmissions: problem._count.submissions,
        solvedBy: acceptedSubmissions.map((s) => s.member.name),
        isSolved: acceptedSubmissions.length > 0,
      };
    })
  );

  // Group by category
  const grouped: Record<string, typeof problemsWithStatus> = {};
  for (const problem of problemsWithStatus) {
    const cat = problem.category || "Unknown";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(problem);
  }

  return NextResponse.json(grouped);
}
