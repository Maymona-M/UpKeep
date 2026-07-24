import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { findUserById, publicUser } from "@/lib/users";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const user = await findUserById(session.userId);
  if (!user) redirect("/login");

  const settings = publicUser(user);

  return (
    <SettingsClient
      email={settings.email}
      initialEmails={settings.notificationEmails}
      initialViewToken={settings.viewToken}
    />
  );
}
