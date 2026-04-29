import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMonitor } from "@/lib/monitor";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all active monitors that need checking
  // A monitor needs checking if (lastCheckedAt + interval) <= now
  const monitors = await prisma.monitor.findMany({
    where: {
      active: true,
    },
  });

  const monitorsToCheck = monitors.filter((m) => {
    if (!m.lastCheckedAt) return true; // never checked
    const nextCheck = new Date(m.lastCheckedAt.getTime() + m.interval * 60000);
    return nextCheck <= now;
  });

  console.log(`[Scheduler] Found ${monitorsToCheck.length} monitors to check.`);

  // Run checks in parallel with a limit or sequentially
  // For simplicity and to avoid Vercel timeout, we'll run them and wait
  const results = await Promise.allSettled(
    monitorsToCheck.map((m) => checkMonitor(m.id))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    message: "Processed queue",
    total: monitorsToCheck.length,
    succeeded,
    failed,
  });
}
