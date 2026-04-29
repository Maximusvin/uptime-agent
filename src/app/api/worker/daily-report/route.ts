import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramDailyReport } from "@/lib/telegram";

// POST /api/worker/daily-report
// Called by Vercel cron (vercel.json) at 08:00 Kyiv time = 05:00 UTC
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  // Fetch all users with their monitors
  const users = await prisma.user.findMany({
    include: {
      monitors: {
        where: { active: true },
        include: {
          checkLogs: {
            where: {
              checkedAt: { gte: yesterday, lt: today },
            },
            select: { status: true },
          },
        },
      },
    },
  });

  // Collect all unique telegram chat IDs per user
  for (const user of users) {
    if (user.monitors.length === 0) continue;

    const monitorStats = user.monitors.map((m) => {
      const total = m.checkLogs.length;
      const upCount = m.checkLogs.filter((l) => l.status === "UP").length;
      const downEvents = m.checkLogs.filter((l) => l.status === "DOWN").length;
      const uptime = total > 0 ? (upCount / total) * 100 : 100;
      return {
        name: m.name,
        url: m.url,
        uptime,
        downEvents,
        lastStatus: m.lastStatus ?? "UNKNOWN",
      };
    });

    const totalChecks = monitorStats.reduce(
      (sum, m) => sum + (m.downEvents + (m.uptime * (m.downEvents + 1)) / 100),
      0
    );
    const totalDownEvents = monitorStats.reduce(
      (sum, m) => sum + m.downEvents,
      0
    );
    const avgUptimePercent =
      monitorStats.reduce((sum, m) => sum + m.uptime, 0) / monitorStats.length;

    const reportDate = yesterday.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // Save daily report
    const reportPayload = {
      date: reportDate,
      totalMonitors: user.monitors.length,
      totalChecks: Math.round(totalChecks),
      totalDownEvents,
      avgUptimePercent: Math.round(avgUptimePercent * 100) / 100,
      monitors: monitorStats.map((m) => ({ ...m, lastStatus: String(m.lastStatus) })),
    };

    await prisma.dailyReport.create({
      data: {
        userId: user.id,
        reportDate: yesterday,
        totalMonitors: user.monitors.length,
        totalChecks: Math.round(totalChecks),
        totalDownEvents,
        avgUptimePercent: Math.round(avgUptimePercent * 100) / 100,
        reportJson: reportPayload,
      },
    });

    // Send to all unique Telegram chats configured by this user
    const telegramChats = [
      ...new Set(
        user.monitors
          .filter((m) => m.telegramChatId)
          .map((m) => m.telegramChatId!)
      ),
    ];

    for (const chatId of telegramChats) {
      await sendTelegramDailyReport(chatId, reportPayload);
    }
  }

  return NextResponse.json({ success: true, processedUsers: users.length });
}
