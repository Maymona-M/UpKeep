import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/mongodb";
import { todayStr } from "@/lib/dates";
import { serializeObligation } from "@/lib/obligations";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/obligations/[id]/confirm-next
// Body: { nextDueDate: "YYYY-MM-DD" }
// Recurring obligations never roll forward automatically - the admin must
// look at the real-world renewal and confirm the actual next due date.
export async function POST(request, { params }) {
  const { id } = await params;
  let _id;
  try {
    _id = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { nextDueDate } = body || {};
  if (typeof nextDueDate !== "string" || !DATE_RE.test(nextDueDate)) {
    return NextResponse.json(
      { error: "nextDueDate is required and must be in YYYY-MM-DD format." },
      { status: 422 }
    );
  }

  const col = await getCollection("obligations");
  const existing = await col.findOne({ _id });
  if (!existing) return NextResponse.json({ error: "Obligation not found." }, { status: 404 });
  if (!existing.recurring) {
    return NextResponse.json(
      { error: "Only recurring obligations can be confirmed forward. Edit the due date directly instead." },
      { status: 400 }
    );
  }

  const now = new Date();
  const result = await col.findOneAndUpdate(
    { _id },
    { $set: { dueDate: nextDueDate, lastConfirmedAt: now, updatedAt: now, status: "active" } },
    { returnDocument: "after" }
  );

  // A fresh due date means past reminders no longer apply - clear logs so
  // the new cycle's 30/7/1-day reminders can fire again.
  const logs = await getCollection("reminderLogs");
  await logs.deleteMany({ obligationId: id });

  return NextResponse.json({ obligation: serializeObligation(result, todayStr()) });
}
