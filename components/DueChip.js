"use client";

const STYLES = {
  overdue: { bg: "var(--color-amber)", fg: "var(--color-ink)", ring: "var(--color-amber-soft)" },
  due_today: { bg: "var(--color-cream)", fg: "var(--color-ink)", ring: "var(--color-cream-soft)" },
  upcoming: { bg: "var(--color-mint)", fg: "var(--color-ink)", ring: "var(--color-mint-soft)" },
  done: { bg: "var(--color-ink-soft)", fg: "var(--color-mint-soft)", ring: "var(--color-teal)" },
};

function label(computedStatus, daysDiff) {
  if (computedStatus === "done") return { big: "✓", small: "done" };
  if (computedStatus === "overdue") return { big: `${Math.abs(daysDiff)}`, small: daysDiff === -1 ? "day overdue" : "days overdue" };
  if (computedStatus === "due_today") return { big: "0", small: "due today" };
  return { big: `${daysDiff}`, small: daysDiff === 1 ? "day left" : "days left" };
}

export default function DueChip({ computedStatus, daysDiff, size = "md" }) {
  const s = STYLES[computedStatus] || STYLES.upcoming;
  const { big, small } = label(computedStatus, daysDiff);
  const dims = size === "lg" ? "w-20 h-20 text-3xl" : "w-14 h-14 text-lg";

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl shrink-0 ${dims}`}
      style={{ background: s.bg, color: s.fg, boxShadow: `0 0 0 3px ${s.ring}33` }}
    >
      <span className="font-mono font-semibold leading-none">{big}</span>
      <span className="font-mono uppercase tracking-wide leading-none mt-1" style={{ fontSize: size === "lg" ? "9px" : "7px" }}>
        {small}
      </span>
    </div>
  );
}
