import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/mongodb";
import { todayStr } from "@/lib/dates";
import { getServerSession } from "@/lib/auth";
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
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const _id = parseId(id);
  if (!_id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const col = await getCollection("obligations");
  const doc = await col.findOne({ _id, ownerId: session.userId });
  if (!doc) return NextResponse.json({ error: "Obligation not found." }, { status: 404 });

  return NextResponse.json({ obligation: serializeObligation(doc, todayStr()) });
}

export async function PATCH(request, { params }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

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
      { _id, ownerId: session.userId },
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
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const _id = parseId(id);
  if (!_id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const col = await getCollection("obligations");
  const result = await col.deleteOne({ _id, ownerId: session.userId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Obligation not found." }, { status: 404 });
  }

  const logs = await getCollection("reminderLogs");
  await logs.deleteMany({ obligationId: id });

  return NextResponse.json({ ok: true });
}
