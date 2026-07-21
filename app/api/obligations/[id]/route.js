import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/mongodb";
import { todayStr } from "@/lib/dates";
import {
  validateObligationInput,
  serializeObligation,
  ValidationError,
} from "@/lib/obligations";

function parseId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function GET(request, { params }) {
  const { id } = await params;
  const _id = parseId(id);
  if (!_id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const col = await getCollection("obligations");
  const doc = await col.findOne({ _id });
  if (!doc) return NextResponse.json({ error: "Obligation not found." }, { status: 404 });

  return NextResponse.json({ obligation: serializeObligation(doc, todayStr()) });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const _id = parseId(id);
  if (!_id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const clean = validateObligationInput(body, { partial: true });
    const col = await getCollection("obligations");
    const result = await col.findOneAndUpdate(
      { _id },
      { $set: { ...clean, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) return NextResponse.json({ error: "Obligation not found." }, { status: 404 });
    return NextResponse.json({ obligation: serializeObligation(result, todayStr()) });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, fields: err.fields }, { status: 422 });
    }
    return NextResponse.json({ error: "Could not update the obligation. Please try again." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const _id = parseId(id);
  if (!_id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const col = await getCollection("obligations");
  const result = await col.deleteOne({ _id });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Obligation not found." }, { status: 404 });
  }

  // Clean up reminder logs so a future obligation reusing timing doesn't
  // inherit stale "already sent" state (harmless either way, but tidy).
  const logs = await getCollection("reminderLogs");
  await logs.deleteMany({ obligationId: id });

  return NextResponse.json({ ok: true });
}
