"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { CATEGORY_KEYS, categoryMeta } from "@/lib/categories";

const RECURRENCE_UNITS = ["days", "weeks", "months", "years"];
const DEFAULT_OFFSETS = "30, 7, 1";

function toOffsetsArray(str) {
  return str
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export default function ObligationModal({ obligation, onClose, onSaved }) {
  const isEdit = Boolean(obligation);
  const [title, setTitle] = useState(obligation?.title || "");
  const [category, setCategory] = useState(obligation?.category || CATEGORY_KEYS[0]);
  const [dueDate, setDueDate] = useState(obligation?.dueDate || "");
  const [notes, setNotes] = useState(obligation?.notes || "");
  const [recurring, setRecurring] = useState(obligation?.recurring || false);
  const [interval, setInterval_] = useState(obligation?.recurrence?.interval || 1);
  const [unit, setUnit] = useState(obligation?.recurrence?.unit || "years");
  const [offsetsStr, setOffsetsStr] = useState(
    obligation?.reminderOffsets?.join(", ") || DEFAULT_OFFSETS
  );
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSaving(true);

    const payload = {
      title,
      category,
      dueDate,
      notes,
      recurring,
      reminderOffsets: toOffsetsArray(offsetsStr),
      ...(recurring ? { recurrence: { interval: Number(interval), unit } } : {}),
    };

    try {
      const res = await fetch(isEdit ? `/api/obligations/${obligation.id}` : "/api/obligations", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save. Please try again.");
        setFieldErrors(data.fields || {});
        setSaving(false);
        return;
      }
      onSaved(data.obligation);
    } catch {
      setError("Could not reach the server. Your changes were not saved.");
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
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6 border"
        style={{ background: "var(--color-ink)", borderColor: "var(--color-ink-soft)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-white">
            {isEdit ? "Edit obligation" : "New obligation"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 hover:bg-white/10"
          >
            <X size={18} color="var(--color-mint)" />
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm rounded-lg px-3 py-2" style={{ background: "#F2A93B22", color: "var(--color-amber)" }}>
            {error}
          </p>
        )}

        <div className="space-y-4">
          <Field label="Title" error={fieldErrors.title}>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Renew passport"
              maxLength={200}
              required
            />
          </Field>

          <Field label="Category" error={fieldErrors.category}>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_KEYS.map((key) => {
                const meta = categoryMeta(key);
                const active = category === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setCategory(key)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm border text-left"
                    style={{
                      borderColor: active ? meta.color : "var(--color-ink-soft)",
                      background: active ? `${meta.color}1f` : "transparent",
                      color: active ? meta.color : "var(--color-mint-soft)",
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Due date" error={fieldErrors.dueDate}>
            <input
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </Field>

          <Field label="Notes (optional — never store account, policy, or ID numbers here)" error={fieldErrors.notes}>
            <textarea
              className="input min-h-[72px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              placeholder="e.g. Renew at the DMV on Elm St, bring proof of address"
            />
          </Field>

          <Field label="Remind us (days before, comma-separated)" error={fieldErrors.reminderOffsets}>
            <input
              className="input"
              value={offsetsStr}
              onChange={(e) => setOffsetsStr(e.target.value)}
              placeholder="30, 7, 1"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--color-mint-soft)" }}>
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-teal)]"
            />
            This repeats
          </label>

          {recurring && (
            <Field label="Repeats every" error={fieldErrors.recurrence}>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  className="input w-24"
                  value={interval}
                  onChange={(e) => setInterval_(e.target.value)}
                />
                <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {RECURRENCE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--color-mint)" }}>
                This is only a planning hint. When it's due, you'll confirm the real next date yourself —
                nothing rolls over automatically.
              </p>
            </Field>
          )}
        </div>

        <div className="mt-6 flex gap-3">
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
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add obligation"}
          </button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            border-radius: 0.75rem;
            padding: 0.6rem 0.9rem;
            background: var(--color-ink-soft);
            border: 1px solid var(--color-ink-soft);
            color: white;
            outline: none;
          }
          .input:focus {
            border-color: var(--color-teal);
          }
        `}</style>
      </form>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-mint)" }}>
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-amber)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
