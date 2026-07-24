import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { todayStr } from "@/lib/dates";
import { getServerSession } from "@/lib/auth";
import {
  validateObligationInput,
  serializeObligation,
  ValidationError,
} from "@/lib/obligations";

// GET /api/obligations - list every obligation belonging to the logged-in
// user's household only. Sorted soonest-due first.
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    const col = await getCollection("obligations");
    const docs = await col.find({ ownerId: session.userId }).sort({ dueDate: 1 }).toArray();
    const today = todayStr();
    return NextResponse.json({ obligations: docs.map((d) => serializeObligation(d, today)) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/obligations - create a new obligation, owned by the logged-in user.
export async function POST(request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const clean = validateObligationInput(body);
    const col = await getCollection("obligations");
    const now = new Date();
    const doc = {
      ...clean,
      ownerId: session.userId,
      recurring: clean.recurring || false,
      recurrence: clean.recurring ? clean.recurrence : null,
      reminderOffsets: clean.reminderOffsets || null,
      status: "active",
      lastConfirmedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const result = await col.insertOne(doc);
    const saved = await col.findOne({ _id: result.insertedId });
    return NextResponse.json({ obligation: serializeObligation(saved, todayStr()) }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, fields: err.fields }, { status: 422 });
    }
    return NextResponse.json({ error: "Could not save the obligation. Please try again." }, { status: 500 });
  }
}
