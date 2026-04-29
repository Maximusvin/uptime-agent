import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
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

  const history = await prisma.seoSnapshot.findMany({
    where: { monitorId: id },
    orderBy: { snapshotAt: "desc" },
    take: 50,
  });

  return NextResponse.json(history);
}
