import { redirect } from "next/navigation";
import { getCollection } from "@/lib/mongodb";
import { getServerSession } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import { todayStr } from "@/lib/dates";
import { serializeObligation } from "@/lib/obligations";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const user = await findUserById(session.userId);
  if (!user) redirect("/login");

  const col = await getCollection("obligations");
  const docs = await col.find({ ownerId: session.userId }).sort({ dueDate: 1 }).toArray();
  const today = todayStr();
  const obligations = docs.map((d) => serializeObligation(d, today));

  return <Dashboard initialObligations={obligations} viewToken={user.viewToken} userEmail={user.email} />;
}
