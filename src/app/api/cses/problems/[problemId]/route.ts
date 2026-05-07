import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ problemId: string }> }
) {
  const { problemId } = await params;

  const problem = await prisma.csesProblem.findUnique({
    where: { csesId: problemId },
  });

  if (!problem) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  const submissions = await prisma.csesSubmission.findMany({
    where: { problemId: problem.id },
    include: {
      member: { select: { id: true, name: true, csesUsername: true } },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    problem,
    submissions,
  });
}
