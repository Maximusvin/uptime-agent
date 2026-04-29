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

  // AUTO-MIGRATION: Ensure DB is synced before loading
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "SeoSnapshot" ADD COLUMN IF NOT EXISTS "keywordsFound" JSONB;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "SeoSnapshot" ADD COLUMN IF NOT EXISTS "brokenUrls" JSONB;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Monitor" ADD COLUMN IF NOT EXISTS "sslValidUntil" TIMESTAMP;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Monitor" ADD COLUMN IF NOT EXISTS "sslIssuer" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Monitor" ADD COLUMN IF NOT EXISTS "keywords" TEXT;`);
  } catch (e) {
    console.log("Migration notice (expected during sync):", e);
  }

  let monitors: any[] = [];
  try {
    monitors = await prisma.monitor.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        checkLogs: {
          orderBy: { checkedAt: "desc" },
          take: 90,
          select: { status: true, checkedAt: true },
        },
      },
    });
  } catch (dbError) {
    console.error("Dashboard DB error, falling back to basic fields:", dbError);
    // Emergency fallback: fetch only basic fields if schema is broken
    monitors = await (prisma.monitor.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, url: true, lastStatus: true, uptimePercent: true, active: true
      }
    }) as any);
  }


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
