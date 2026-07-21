import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { getSettings } from "@/lib/settings";
import { todayStr } from "@/lib/dates";
import { serializePublicObligation } from "@/lib/obligations";

// GET /api/public/[token] - read-only, no login. Security is the token
// itself: long, random, and never guessable or enumerable. Anything
// sensitive (passport numbers, policy numbers, payment info) is never
// stored in the first place, so there's nothing sensitive to leak here.
export async function GET(request, { params }) {
  const { token } = await params;
  const settings = await getSettings();

  if (!settings.viewToken || token !== settings.viewToken) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  const col = await getCollection("obligations");
  const docs = await col.find({}).sort({ dueDate: 1 }).toArray();
  const today = todayStr();
  return NextResponse.json({
    obligations: docs.map((d) => serializePublicObligation(d, today)),
  });
}
