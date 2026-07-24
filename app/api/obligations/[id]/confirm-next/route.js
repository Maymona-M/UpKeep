import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/mongodb";
import { todayStr } from "@/lib/dates";
import { getServerSession } from "@/lib/auth";
import { serializeObligation } from "@/lib/obligations";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request, { params }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

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
  const existing = await col.findOne({ _id, ownerId: session.userId });
  if (!existing) return NextResponse.json({ error: "Obligation not found." }, { status: 404 });
  if (!existing.recurring) {
    return NextResponse.json(
      { error: "Only recurring obligations can be confirmed forward. Edit the due date directly instead." },
      { status: 400 }
    );
  }

  const now = new Date();
  const result = await col.findOneAndUpdate(
    { _id, ownerId: session.userId },
    { $set: { dueDate: nextDueDate, lastConfirmedAt: now, updatedAt: now, status: "active" } },
    { returnDocument: "after" }
  );

  const logs = await getCollection("reminderLogs");
  await logs.deleteMany({ obligationId: id });

  return NextResponse.json({ obligation: serializeObligation(result, todayStr()) });
}
