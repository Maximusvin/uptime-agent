import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";

export const metadata = {
  title: "Дашборд — UptimeAgent",
  description: "Огляд усіх ваших моніторів та їхнього статусу",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const monitors = await prisma.monitor.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      checkLogs: {
        orderBy: { checkedAt: "desc" },
        take: 90, // for uptime bar visualization
        select: { status: true, checkedAt: true },
      },
    },
  });

  // Stats
  const totalMonitors = monitors.length;
  const upCount = monitors.filter((m) => m.lastStatus === "UP").length;
  const downCount = monitors.filter((m) => m.lastStatus === "DOWN").length;
  const avgUptime =
    totalMonitors > 0
      ? monitors.reduce((s, m) => s + (m.uptimePercent ?? 100), 0) /
        totalMonitors
      : 100;

  return (
    <DashboardClient
      user={{
        name: session.user.name ?? "Користувач",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
      monitors={JSON.parse(JSON.stringify(monitors))}
      stats={{ totalMonitors, upCount, downCount, avgUptime }}
    />
  );
}
