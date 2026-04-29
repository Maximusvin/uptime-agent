import { prisma } from "@/lib/prisma";

export async function generateUserReport(userId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      monitors: {
        include: {
          checkLogs: {
            where: {
              checkedAt: { gte: startOfDay, lt: endOfDay },
            },
            select: { status: true, responseMs: true },
          },
        },
      },
    },
  });

  if (!user || user.monitors.length === 0) return null;

  const monitorStats = user.monitors.map((m) => {
    const total = m.checkLogs.length;
    const upCount = m.checkLogs.filter((l) => l.status === "UP").length;
    const downEvents = m.checkLogs.filter((l) => l.status === "DOWN").length;
    const avgResponseMs = total > 0 
      ? m.checkLogs.reduce((sum, l) => sum + (l.responseMs || 0), 0) / total 
      : 0;
    const uptime = total > 0 ? (upCount / total) * 100 : 100;
    
    return {
      name: m.name,
      url: m.url,
      uptime,
      downEvents,
      avgResponseMs: Math.round(avgResponseMs),
      lastStatus: m.lastStatus ?? "UNKNOWN",
    };
  });

  const totalChecks = monitorStats.reduce((sum, m) => sum + m.downEvents + 1, 0); // Simplified for manual trigger
  // Wait, let's use actual logs count
  const actualTotalChecks = user.monitors.reduce((sum, m) => sum + m.checkLogs.length, 0);
  
  const totalDownEvents = monitorStats.reduce((sum, m) => sum + m.downEvents, 0);
  const avgUptimePercent = monitorStats.length > 0
    ? monitorStats.reduce((sum, m) => sum + m.uptime, 0) / monitorStats.length
    : 100;

  const reportDateStr = startOfDay.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const reportPayload = {
    date: reportDateStr,
    totalMonitors: user.monitors.length,
    totalChecks: actualTotalChecks,
    totalDownEvents,
    avgUptimePercent: Math.round(avgUptimePercent * 100) / 100,
    monitors: monitorStats,
  };

  // Upsert the report for this day
  const existingReport = await prisma.dailyReport.findFirst({
    where: { userId, reportDate: startOfDay }
  });

  if (existingReport) {
    return await prisma.dailyReport.update({
      where: { id: existingReport.id },
      data: {
        totalMonitors: user.monitors.length,
        totalChecks: actualTotalChecks,
        totalDownEvents,
        avgUptimePercent: Math.round(avgUptimePercent * 100) / 100,
        reportJson: reportPayload,
        generatedAt: new Date(),
      }
    });
  } else {
    return await prisma.dailyReport.create({
      data: {
        userId,
        reportDate: startOfDay,
        totalMonitors: user.monitors.length,
        totalChecks: actualTotalChecks,
        totalDownEvents,
        avgUptimePercent: Math.round(avgUptimePercent * 100) / 100,
        reportJson: reportPayload,
      },
    });
  }
}
