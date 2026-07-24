import { getCollection } from "@/lib/mongodb";
import { findUserByViewToken } from "@/lib/users";
import { todayStr } from "@/lib/dates";
import { serializePublicObligation } from "@/lib/obligations";
import CategoryIcon from "@/components/CategoryIcon";
import DueChip from "@/components/DueChip";
import { categoryMeta } from "@/lib/categories";

export const metadata = { title: "UpKeep — household deadlines" };
export const dynamic = "force-dynamic";

export default async function PublicViewPage({ params }) {
  const { token } = await params;
  const user = await findUserByViewToken(token);

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-display text-xl font-semibold text-white mb-2">Link not found</h1>
          <p className="text-sm" style={{ color: "var(--color-mint)" }}>
            This link isn't valid anymore. Ask the household admin for a current one.
          </p>
        </div>
      </main>
    );
  }

  const col = await getCollection("obligations");
  const docs = await col.find({ ownerId: user._id.toString() }).sort({ dueDate: 1 }).toArray();
  const today = todayStr();
  const obligations = docs.map((d) => serializePublicObligation(d, today));
  const active = obligations.filter((o) => o.computedStatus !== "done");
  const done = obligations.filter((o) => o.computedStatus === "done");

  return (
    <main className="min-h-screen pb-16">
      <header className="px-4 sm:px-8 py-5 border-b" style={{ borderColor: "var(--color-ink-soft)" }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "var(--color-teal)" }}>
            <span className="font-display font-bold" style={{ color: "var(--color-cream)" }}>
              U
            </span>
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-white leading-tight">UpKeep</p>
            <p className="text-xs" style={{ color: "var(--color-mint)" }}>
              Read-only view · household deadlines
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-8 pt-6 max-w-2xl mx-auto">
        {active.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-mint)" }}>
            Nothing upcoming right now.
          </p>
        ) : (
          <ul className="space-y-2.5 mb-8">
            {active.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border p-4 flex items-center gap-4"
                style={{ borderColor: "var(--color-ink-soft)", background: "var(--color-ink-soft)" }}
              >
                <DueChip computedStatus={o.computedStatus} daysDiff={o.daysDiff} />
                <CategoryIcon category={o.category} />
                <div className="min-w-0">
                  <p className="font-medium text-white">{o.title}</p>
                  <p className="text-xs" style={{ color: "var(--color-mint)" }}>
                    {categoryMeta(o.category).label} · due {o.dueDate}
                  </p>
                  {o.notes && (
                    <p className="text-xs mt-1" style={{ color: "var(--color-mint-soft)" }}>
                      {o.notes}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {done.length > 0 && (
          <>
            <h2 className="text-xs uppercase tracking-wide font-mono mb-2" style={{ color: "var(--color-mint)" }}>
              Done
            </h2>
            <ul className="space-y-2 opacity-60">
              {done.map((o) => (
                <li key={o.id} className="rounded-xl border px-4 py-2.5 flex items-center gap-3" style={{ borderColor: "var(--color-ink-soft)" }}>
                  <CategoryIcon category={o.category} size={14} />
                  <span className="text-sm text-white line-through">{o.title}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
