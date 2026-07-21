"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Undo2,
  Link2,
  Copy,
  Settings as SettingsIcon,
  LogOut,
  CalendarClock,
} from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import DueChip from "@/components/DueChip";
import ObligationModal from "@/components/ObligationModal";
import ConfirmNextModal from "@/components/ConfirmNextModal";
import { categoryMeta } from "@/lib/categories";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "soon", label: "Due this week" },
  { key: "upcoming", label: "Upcoming" },
  { key: "done", label: "Done" },
];

function matchesFilter(o, filter) {
  if (filter === "all") return o.computedStatus !== "done";
  if (filter === "done") return o.computedStatus === "done";
  if (filter === "overdue") return o.computedStatus === "overdue";
  if (filter === "soon")
    return o.computedStatus !== "done" && o.daysDiff >= 0 && o.daysDiff <= 7;
  if (filter === "upcoming") return o.computedStatus === "upcoming" && o.daysDiff > 7;
  return true;
}

export default function Dashboard({ initialObligations, viewToken }) {
  const router = useRouter();
  const [obligations, setObligations] = useState(initialObligations);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', obligation? }
  const [confirmTarget, setConfirmTarget] = useState(null); // obligation for confirm-next
  const [linkOpen, setLinkOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const shareUrl =
    typeof window !== "undefined" && viewToken ? `${window.location.origin}/view/${viewToken}` : "";

  const counts = useMemo(() => {
    const c = { overdue: 0, soon: 0, upcoming: 0, done: 0 };
    for (const o of obligations) {
      if (o.computedStatus === "done") c.done += 1;
      else if (o.computedStatus === "overdue") c.overdue += 1;
      else if (o.daysDiff <= 7) c.soon += 1;
      else c.upcoming += 1;
    }
    return c;
  }, [obligations]);

  const nextUp = useMemo(() => {
    const active = obligations.filter((o) => o.computedStatus !== "done");
    return active.length ? active[0] : null; // already sorted by dueDate from the server
  }, [obligations]);

  const visible = obligations.filter((o) => matchesFilter(o, filter));

  function upsertLocal(updated) {
    setObligations((prev) => {
      const exists = prev.some((o) => o.id === updated.id);
      const next = exists ? prev.map((o) => (o.id === updated.id ? updated : o)) : [...prev, updated];
      return [...next].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    });
  }

  async function handleDelete(o) {
    if (!window.confirm(`Delete "${o.title}"? This can't be undone.`)) return;
    setBusyId(o.id);
    try {
      const res = await fetch(`/api/obligations/${o.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not delete this obligation.");
        return;
      }
      setObligations((prev) => prev.filter((x) => x.id !== o.id));
    } catch {
      alert("Could not reach the server. Nothing was deleted.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleDone(o) {
    setBusyId(o.id);
    try {
      const res = await fetch(`/api/obligations/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: o.status === "done" ? "active" : "done" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Could not update this obligation.");
        return;
      }
      upsertLocal(data.obligation);
    } catch {
      alert("Could not reach the server. Nothing was changed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="min-h-screen pb-24">
      <header
        className="sticky top-0 z-30 border-b backdrop-blur px-4 sm:px-8 py-4 flex items-center justify-between"
        style={{ borderColor: "var(--color-ink-soft)", background: "#06202Bcc" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "var(--color-teal)" }}>
            <span className="font-display font-bold" style={{ color: "var(--color-cream)" }}>
              U
            </span>
          </div>
          <span className="font-display text-lg font-semibold text-white">UpKeep</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setLinkOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium"
            style={{ background: "var(--color-ink-soft)", color: "var(--color-mint-soft)" }}
          >
            <Link2 size={16} /> <span className="hidden sm:inline">Family link</span>
          </button>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium"
            style={{ background: "var(--color-ink-soft)", color: "var(--color-mint-soft)" }}
          >
            <SettingsIcon size={16} /> <span className="hidden sm:inline">Settings</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium"
            style={{ color: "var(--color-amber)" }}
          >
            <LogOut size={16} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {linkOpen && (
        <div className="px-4 sm:px-8 pt-4">
          <div
            className="rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            style={{ borderColor: "var(--color-teal)", background: "var(--color-ink-soft)" }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium mb-1" style={{ color: "var(--color-mint)" }}>
                Private read-only link for family members — no account needed
              </p>
              <p className="font-mono text-sm truncate text-white">{shareUrl || "Loading…"}</p>
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium shrink-0"
              style={{ background: "var(--color-teal)", color: "white" }}
            >
              <Copy size={15} /> {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-8 pt-6">
        {nextUp && (
          <div
            className="rounded-2xl border p-5 flex items-center gap-4 mb-6"
            style={{ borderColor: "var(--color-ink-soft)", background: "linear-gradient(135deg, var(--color-ink-soft), transparent)" }}
          >
            <DueChip computedStatus={nextUp.computedStatus} daysDiff={nextUp.daysDiff} size="lg" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide font-mono mb-1" style={{ color: "var(--color-mint)" }}>
                Next up
              </p>
              <h2 className="font-display text-xl font-semibold text-white truncate">{nextUp.title}</h2>
              <p className="text-sm" style={{ color: "var(--color-mint-soft)" }}>
                {categoryMeta(nextUp.category).label} · due {nextUp.dueDate}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="rounded-full px-3.5 py-1.5 text-sm font-medium border"
                style={{
                  borderColor: filter === f.key ? "var(--color-mint)" : "var(--color-ink-soft)",
                  background: filter === f.key ? "var(--color-mint)" : "transparent",
                  color: filter === f.key ? "var(--color-ink)" : "var(--color-mint-soft)",
                }}
              >
                {f.label}
                {f.key === "overdue" && counts.overdue > 0 && ` · ${counts.overdue}`}
                {f.key === "soon" && counts.soon > 0 && ` · ${counts.soon}`}
              </button>
            ))}
          </div>
          <button
            onClick={() => setModal({ mode: "create" })}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium"
            style={{ background: "var(--color-cream)", color: "var(--color-ink)" }}
          >
            <Plus size={16} /> Add obligation
          </button>
        </div>

        {visible.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed p-10 text-center"
            style={{ borderColor: "var(--color-ink-soft)" }}
          >
            <CalendarClock className="mx-auto mb-3" size={28} color="var(--color-teal-soft)" />
            <p className="font-display text-lg text-white mb-1">Nothing here yet</p>
            <p className="text-sm" style={{ color: "var(--color-mint)" }}>
              {filter === "all"
                ? "Add the first deadline your household needs to keep visible."
                : "Nothing matches this filter right now."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {visible.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap"
                style={{ borderColor: "var(--color-ink-soft)", background: "var(--color-ink-soft)", opacity: busyId === o.id ? 0.6 : 1 }}
              >
                <DueChip computedStatus={o.computedStatus} daysDiff={o.daysDiff} />
                <CategoryIcon category={o.category} />
                <div className="flex-1 min-w-[140px]">
                  <p className="font-medium text-white">{o.title}</p>
                  <p className="text-xs" style={{ color: "var(--color-mint)" }}>
                    {categoryMeta(o.category).label} · due {o.dueDate}
                    {o.recurring && ` · repeats every ${o.recurrence?.interval} ${o.recurrence?.unit}`}
                  </p>
                  {o.notes && (
                    <p className="text-xs mt-1 truncate" style={{ color: "var(--color-mint-soft)" }}>
                      {o.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  {o.recurring && (o.computedStatus === "overdue" || o.computedStatus === "due_today") && (
                    <button
                      onClick={() => setConfirmTarget(o)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={{ background: "var(--color-teal)", color: "white" }}
                    >
                      Confirm next date
                    </button>
                  )}
                  {!o.recurring && (
                    <button
                      onClick={() => toggleDone(o)}
                      title={o.status === "done" ? "Mark active again" : "Mark done"}
                      className="rounded-lg p-2"
                      style={{ background: "var(--color-ink)", color: "var(--color-mint)" }}
                    >
                      {o.status === "done" ? <Undo2 size={15} /> : <Check size={15} />}
                    </button>
                  )}
                  <button
                    onClick={() => setModal({ mode: "edit", obligation: o })}
                    title="Edit"
                    className="rounded-lg p-2"
                    style={{ background: "var(--color-ink)", color: "var(--color-mint)" }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(o)}
                    title="Delete"
                    className="rounded-lg p-2"
                    style={{ background: "var(--color-ink)", color: "var(--color-amber)" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal && (
        <ObligationModal
          obligation={modal.mode === "edit" ? modal.obligation : null}
          onClose={() => setModal(null)}
          onSaved={(o) => {
            upsertLocal(o);
            setModal(null);
          }}
        />
      )}

      {confirmTarget && (
        <ConfirmNextModal
          obligation={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onConfirmed={(o) => {
            upsertLocal(o);
            setConfirmTarget(null);
          }}
        />
      )}
    </main>
  );
}
