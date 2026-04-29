import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportsClient from "@/components/ReportsClient";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  // Fetch daily reports for the user
  const reports = await prisma.dailyReport.findMany({
    where: { userId: session.user.id },
    orderBy: { reportDate: "desc" },
    take: 30,
  });

  return <ReportsClient user={session.user as any} reports={reports as any} />;
}
