import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return <SettingsClient user={session.user as any} />;
}
