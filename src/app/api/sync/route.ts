import { NextResponse } from "next/server";
import { syncAll, syncCodeforces, syncCodeforcesSourceCode, syncCses } from "@/lib/sync";
import prisma from "@/lib/db";

export const maxDuration = 300;

let syncRunning = false;

export async function POST(request: Request) {
  if (syncRunning) {
    return NextResponse.json(
      { error: "A sync is already running" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const platform = body.platform || "all";

  syncRunning = true;

  try {
    let result;

    switch (platform) {
      case "codeforces":
        result = await syncCodeforces();
        break;
      case "codeforces-code":
        result = await syncCodeforcesSourceCode();
        break;
      case "cses":
        result = await syncCses();
        break;
      default:
        result = await syncAll();
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  } finally {
    syncRunning = false;
  }
}

export async function GET() {
  try {
    const logs = await prisma.syncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      isRunning: syncRunning,
      logs,
    });
  } catch (error) {
    return NextResponse.json({
      isRunning: false,
      logs: [],
      error: error instanceof Error ? error.message : "Failed to fetch logs",
    });
  }
}
