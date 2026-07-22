import { getCollection } from "@/lib/mongodb";
import { todayStr } from "@/lib/dates";
import { serializeObligation } from "@/lib/obligations";

function csvEscape(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const COLUMNS = [
  "title",
  "category",
  "dueDate",
  "computedStatus",
  "recurring",
  "recurrenceInterval",
  "recurrenceUnit",
  "notes",
  "status",
  "lastConfirmedAt",
];

// GET /api/obligations/export - downloadable CSV backup of every obligation.
// Protected by middleware.js (matches /api/obligations/:path*), same as the
// rest of the admin API - no separate auth check needed here.
export async function GET() {
  const col = await getCollection("obligations");
  const docs = await col.find({}).sort({ dueDate: 1 }).toArray();
  const today = todayStr();
  const rows = docs.map((d) => serializeObligation(d, today));

  const lines = [COLUMNS.join(",")];
  for (const o of rows) {
    lines.push(
      [
        o.title,
        o.category,
        o.dueDate,
        o.computedStatus,
        o.recurring,
        o.recurrence?.interval ?? "",
        o.recurrence?.unit ?? "",
        o.notes,
        o.status,
        o.lastConfirmedAt ? new Date(o.lastConfirmedAt).toISOString() : "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  const csv = lines.join("\n");
  const filename = `upkeep-obligations-${today}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
