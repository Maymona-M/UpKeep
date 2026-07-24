import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { findUserByViewToken } from "@/lib/users";
import { todayStr } from "@/lib/dates";
import { serializePublicObligation } from "@/lib/obligations";

// GET /api/public/[token] - read-only, no login. The token identifies
// exactly one household's owner; only their obligations are returned.
export async function GET(request, { params }) {
  const { token } = await params;
  const user = await findUserByViewToken(token);

  if (!user) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  const col = await getCollection("obligations");
  const docs = await col.find({ ownerId: user._id.toString() }).sort({ dueDate: 1 }).toArray();
  const today = todayStr();
  return NextResponse.json({
    obligations: docs.map((d) => serializePublicObligation(d, today)),
  });
}
