import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkMonitor, scanSeoSnapshot } from "@/lib/monitor";
import { generateUserReport } from "@/lib/reports";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monitor = await prisma.monitor.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  try {
    // AUTO-MIGRATION: Attempt to add missing columns if they don't exist
    // This allows the app to self-heal without manual terminal commands
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "SeoSnapshot" ADD COLUMN IF NOT EXISTS "foundUrls" JSONB;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "SeoSnapshot" ADD COLUMN IF NOT EXISTS "newUrls" JSONB;
      `);
    } catch (e) {
      // Silence errors if columns already exist or if there's a permission issue
      console.log("Auto-migration notice (can be ignored):", e);
    }

    // Perform actual check and SEO scan
    await checkMonitor(monitor.id);
    await scanSeoSnapshot(monitor.id);

    
    // Update the daily report for today so it shows up in the Reports tab
    await generateUserReport(session.user.id, new Date());

    const updatedMonitor = await prisma.monitor.findUnique({
        where: { id: monitor.id },
        include: {
            checkLogs: {
                orderBy: { checkedAt: "desc" },
                take: 90,
            },
            seoSnapshots: {
                orderBy: { snapshotAt: "desc" },
                take: 1,
            }
        }
    });

    return NextResponse.json(updatedMonitor);
  } catch (error) {
    console.error("Manual check error:", error);
    return NextResponse.json({ error: "Failed to perform check" }, { status: 500 });
  }
}


