import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/monitors/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const monitor = await prisma.monitor.findUnique({ where: { id } });

  if (!monitor || monitor.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.monitor.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// PATCH /api/monitors/[id] — toggle active status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const monitor = await prisma.monitor.findUnique({ where: { id } });

  if (!monitor || monitor.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.monitor.update({
    where: { id },
    data: { active: body.active ?? !monitor.active },
  });

  return NextResponse.json(updated);
}

// GET /api/monitors/[id] — get monitor details + last 50 logs
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const monitor = await prisma.monitor.findUnique({
    where: { id },
    include: {
      checkLogs: {
        orderBy: { checkedAt: "desc" },
        take: 50,
      },
      seoSnapshots: {
        orderBy: { snapshotAt: "desc" },
        take: 1,
      },
    },
  });

  if (!monitor || monitor.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(monitor);
}
