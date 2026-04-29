import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
    // We'll call our own worker API to perform the check
    const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
    const checkRes = await fetch(`${baseUrl}/api/worker/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monitorId: monitor.id }),
    });

    if (!checkRes.ok) {
        throw new Error("Check failed");
    }

    const updatedMonitor = await prisma.monitor.findUnique({
        where: { id: monitor.id },
        include: {
            checkLogs: {
                orderBy: { checkedAt: "desc" },
                take: 90,
            }
        }
    });

    return NextResponse.json(updatedMonitor);
  } catch (error) {
    console.error("Manual check error:", error);
    return NextResponse.json({ error: "Failed to perform check" }, { status: 500 });
  }
}
