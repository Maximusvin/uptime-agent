import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMonitor } from "@/lib/monitor";

// POST /api/worker/check
// Called by QStash on each cron tick
export async function POST(req: Request) {
  // Verify QStash signature
  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { monitorId } = body as { monitorId: string };

  if (!monitorId) {
    return NextResponse.json({ error: "Missing monitorId" }, { status: 400 });
  }

  await checkMonitor(monitorId);

  return NextResponse.json({ success: true, monitorId });
}
