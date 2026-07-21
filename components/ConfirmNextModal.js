"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { suggestedNextDueDate } from "@/lib/dates";

export default function ConfirmNextModal({ obligation, onClose, onConfirmed }) {
  const suggestion = suggestedNextDueDate(obligation) || obligation.dueDate;
  const [nextDueDate, setNextDueDate] = useState(suggestion);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/obligations/${obligation.id}/confirm-next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextDueDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not confirm the next date.");
        setSaving(false);
        return;
      }
      onConfirmed(data.obligation);
    } catch {
      setError("Could not reach the server. Nothing was changed.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "#06202Bcc" }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 border"
        style={{ background: "var(--color-ink)", borderColor: "var(--color-ink-soft)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-white">Confirm next date</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-white/10">
            <X size={18} color="var(--color-mint)" />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: "var(--color-mint)" }}>
          "{obligation.title}" repeats every {obligation.recurrence?.interval} {obligation.recurrence?.unit}. Check
          the real-world renewal and set the actual next due date — it won't roll over on its own.
        </p>

        {error && (
          <p className="mb-3 text-sm rounded-lg px-3 py-2" style={{ background: "#F2A93B22", color: "var(--color-amber)" }}>
            {error}
          </p>
        )}

        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-mint)" }}>
          Next due date
        </label>
        <input
          type="date"
          required
          value={nextDueDate}
          onChange={(e) => setNextDueDate(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 border outline-none"
          style={{ background: "var(--color-ink-soft)", borderColor: "var(--color-ink-soft)", color: "white" }}
        />

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 font-medium border"
            style={{ borderColor: "var(--color-ink-soft)", color: "var(--color-mint-soft)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl py-2.5 font-medium disabled:opacity-50"
            style={{ background: "var(--color-teal)", color: "white" }}
          >
            {saving ? "Confirming…" : "Confirm date"}
          </button>
        </div>
      </form>
    </div>
  );
}
