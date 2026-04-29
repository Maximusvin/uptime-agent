import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createMonitorSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  interval: z.enum(["1", "5", "10", "60", "300"]).transform(Number),
  telegramChatId: z.string().optional().nullable(),
});

// GET /api/monitors — list user's monitors
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monitors = await prisma.monitor.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          checkLogs: {
            where: {
              checkedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(monitors);
}

// POST /api/monitors — create a new monitor
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createMonitorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, url, interval, telegramChatId } = parsed.data;

  const monitor = await prisma.monitor.create({
    data: {
      userId: session.user.id,
      name,
      url,
      interval,
      telegramChatId: telegramChatId || null,
    },
  });

  // Schedule in QStash
  await scheduleMonitor(monitor.id, interval);

  return NextResponse.json(monitor, { status: 201 });
}

async function scheduleMonitor(monitorId: string, intervalMinutes: number) {
  const { QSTASH_TOKEN, NEXT_PUBLIC_APP_URL } = process.env;
  if (!QSTASH_TOKEN) return;

  const cronExpression = intervalToCron(intervalMinutes);
  const targetUrl = `${NEXT_PUBLIC_APP_URL}/api/worker/check`;

  try {
    const { default: axios } = await import("axios");
    await axios.post(
      `https://qstash.upstash.io/v2/schedules`,
      { scheduleId: `monitor-${monitorId}`, monitorId },
      {
        headers: {
          Authorization: `Bearer ${QSTASH_TOKEN}`,
          "Upstash-Cron": cronExpression,
          "Upstash-Destination": targetUrl,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[QStash] Failed to schedule monitor:", error);
  }
}

function intervalToCron(minutes: number): string {
  switch (minutes) {
    case 1:
      return "* * * * *";
    case 5:
      return "*/5 * * * *";
    case 10:
      return "*/10 * * * *";
    case 60:
      return "0 * * * *";
    case 300:
      return "0 */5 * * *";
    default:
      return "*/5 * * * *";
  }
}
