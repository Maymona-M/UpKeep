"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Copy, Plus, X } from "lucide-react";

export default function SettingsClient({ initialEmails, initialViewToken }) {
  const [emails, setEmails] = useState(initialEmails.length ? initialEmails : [""]);
  const [emailStatus, setEmailStatus] = useState(null);
  const [savingEmails, setSavingEmails] = useState(false);

  const [viewToken, setViewToken] = useState(initialViewToken);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwStatus, setPwStatus] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/view/${viewToken}` : "";

  async function saveEmails(e) {
    e.preventDefault();
    setSavingEmails(true);
    setEmailStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationEmails: emails.filter((e) => e.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailStatus({ ok: false, message: data.error });
        return;
      }
      setEmails(data.notificationEmails.length ? data.notificationEmails : [""]);
      setEmailStatus({ ok: true, message: "Saved." });
    } catch {
      setEmailStatus({ ok: false, message: "Could not reach the server." });
    } finally {
      setSavingEmails(false);
    }
  }

  async function regenerateLink() {
    if (!window.confirm("Regenerate the family link? The old link will stop working immediately.")) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateViewToken: true }),
      });
      const data = await res.json();
      if (res.ok) setViewToken(data.viewToken);
    } finally {
      setRegenerating(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function changePassword(e) {
    e.preventDefault();
    setSavingPw(true);
    setPwStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwStatus({ ok: false, message: data.error });
        return;
      }
      setPwStatus({ ok: true, message: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setPwStatus({ ok: false, message: "Could not reach the server." });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <main className="min-h-screen px-4 sm:px-8 py-6 max-w-2xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--color-mint)" }}>
        <ArrowLeft size={15} /> Back to dashboard
      </Link>
      <h1 className="font-display text-2xl font-semibold text-white mb-6">Settings</h1>

      {/* Family link */}
      <section className="rounded-2xl border p-5 mb-5" style={{ borderColor: "var(--color-ink-soft)", background: "var(--color-ink-soft)" }}>
        <h2 className="font-display text-base font-semibold text-white mb-1">Family read-only link</h2>
        <p className="text-sm mb-3" style={{ color: "var(--color-mint)" }}>
          Anyone with this link can view upcoming deadlines — no account needed. Regenerating it immediately
          disables the old link.
        </p>
        <p className="font-mono text-sm text-white break-all mb-3">{shareUrl}</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium"
            style={{ background: "var(--color-teal)", color: "white" }}
          >
            <Copy size={15} /> {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={regenerateLink}
            disabled={regenerating}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium border disabled:opacity-50"
            style={{ borderColor: "var(--color-amber)", color: "var(--color-amber)" }}
          >
            <RefreshCw size={15} /> {regenerating ? "Regenerating…" : "Regenerate link"}
          </button>
        </div>
      </section>

      {/* Notification emails */}
      <section className="rounded-2xl border p-5 mb-5" style={{ borderColor: "var(--color-ink-soft)", background: "var(--color-ink-soft)" }}>
        <h2 className="font-display text-base font-semibold text-white mb-1">Reminder emails</h2>
        <p className="text-sm mb-3" style={{ color: "var(--color-mint)" }}>
          Everyone on this list gets the 30/7/1-day, due-today, and daily-overdue reminder emails, if SMTP is
          configured on the server.
        </p>
        <form onSubmit={saveEmails} className="space-y-2">
          {emails.map((email, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmails((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder="name@example.com"
                className="flex-1 rounded-xl px-3 py-2 border outline-none text-white"
                style={{ background: "var(--color-ink)", borderColor: "var(--color-ink)" }}
              />
              <button
                type="button"
                onClick={() => setEmails((prev) => prev.filter((_, j) => j !== i))}
                className="rounded-xl px-2.5"
                style={{ color: "var(--color-amber)" }}
                aria-label="Remove"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEmails((prev) => [...prev, ""])}
            className="flex items-center gap-1.5 text-sm"
            style={{ color: "var(--color-mint)" }}
          >
            <Plus size={14} /> Add another email
          </button>

          {emailStatus && (
            <p className="text-sm" style={{ color: emailStatus.ok ? "var(--color-mint)" : "var(--color-amber)" }}>
              {emailStatus.message}
            </p>
          )}

          <button
            type="submit"
            disabled={savingEmails}
            className="rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--color-teal)", color: "white" }}
          >
            {savingEmails ? "Saving…" : "Save emails"}
          </button>
        </form>
      </section>

      {/* Change password */}
      <section className="rounded-2xl border p-5" style={{ borderColor: "var(--color-ink-soft)", background: "var(--color-ink-soft)" }}>
        <h2 className="font-display text-base font-semibold text-white mb-1">Admin password</h2>
        <p className="text-sm mb-3" style={{ color: "var(--color-mint)" }}>
          This is the one password that unlocks the dashboard. Family members never need it — they use the
          read-only link above.
        </p>
        <form onSubmit={changePassword} className="space-y-2.5">
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className="w-full rounded-xl px-3 py-2 border outline-none text-white"
            style={{ background: "var(--color-ink)", borderColor: "var(--color-ink)" }}
          />
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min. 8 characters)"
            autoComplete="new-password"
            className="w-full rounded-xl px-3 py-2 border outline-none text-white"
            style={{ background: "var(--color-ink)", borderColor: "var(--color-ink)" }}
          />
          {pwStatus && (
            <p className="text-sm" style={{ color: pwStatus.ok ? "var(--color-mint)" : "var(--color-amber)" }}>
              {pwStatus.message}
            </p>
          )}
          <button
            type="submit"
            disabled={savingPw}
            className="rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--color-teal)", color: "white" }}
          >
            {savingPw ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </main>
  );
}
