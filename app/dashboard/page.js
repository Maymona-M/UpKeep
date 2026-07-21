import { getCollection } from "@/lib/mongodb";
import { getSettings } from "@/lib/settings";
import { todayStr } from "@/lib/dates";
import { serializeObligation } from "@/lib/obligations";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [col, settings] = await Promise.all([getCollection("obligations"), getSettings()]);
  const docs = await col.find({}).sort({ dueDate: 1 }).toArray();
  const today = todayStr();
  const obligations = docs.map((d) => serializeObligation(d, today));

  return <Dashboard initialObligations={obligations} viewToken={settings.viewToken} />;
}
