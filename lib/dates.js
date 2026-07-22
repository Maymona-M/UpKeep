// Dates are stored as "YYYY-MM-DD" strings (no time component) since these
// are day-granularity deadlines, not timestamps. This avoids timezone drift
// when comparing "today" to a due date.

export function todayStr(timeZone = process.env.APP_TIMEZONE || "UTC") {
  const now = new Date();
  // en-CA locale formats as YYYY-MM-DD, which is exactly what we want.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

export function daysBetween(fromStr, toStr) {
  const from = new Date(`${fromStr}T00:00:00Z`);
  const to = new Date(`${toStr}T00:00:00Z`);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

// Status of an obligation "today", ignoring completion state.
export function dueStatus(dueDate, today = todayStr()) {
  const diff = daysBetween(today, dueDate); // positive = in the future
  if (diff < 0) return "overdue";
  if (diff === 0) return "due_today";
  return "upcoming";
}

export function addInterval(dateStr, amount, unit) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  switch (unit) {
    case "days":
      d.setUTCDate(d.getUTCDate() + amount);
      break;
    case "weeks":
      d.setUTCDate(d.getUTCDate() + amount * 7);
      break;
    case "months":
      d.setUTCMonth(d.getUTCMonth() + amount);
      break;
    case "years":
      d.setUTCFullYear(d.getUTCFullYear() + amount);
      break;
    default:
      throw new Error(`Unknown recurrence unit: ${unit}`);
  }
  return d.toISOString().slice(0, 10);
}

export function suggestedNextDueDate(obligation) {
  if (!obligation.recurring || !obligation.recurrence) return null;
  const { interval, unit } = obligation.recurrence;
  return addInterval(obligation.dueDate, interval, unit);
}

export const DEFAULT_REMINDER_OFFSETS = [30, 7, 1];

// Returns the list of reminder "kinds" that should fire today for a given
// obligation, given what's already been logged as sent. Kinds are one of:
//   "offset_<N>"   - N days before the due date (from reminderOffsets)
//   "due_today"    - the day it's due
//   "overdue_daily"- every day it's overdue, once completed=false
export function reminderKindsDueToday(obligation, sentKindsToday, today = todayStr()) {
  if (obligation.status === "done") return [];
  const diff = daysBetween(today, obligation.dueDate);
  const offsets = obligation.reminderOffsets?.length
    ? obligation.reminderOffsets
    : DEFAULT_REMINDER_OFFSETS;

  const kinds = [];
  if (diff > 0 && offsets.includes(diff)) kinds.push(`offset_${diff}`);
  if (diff === 0) kinds.push("due_today");
  if (diff < 0) kinds.push("overdue_daily");

  return kinds.filter((k) => !sentKindsToday.has(k));
}
