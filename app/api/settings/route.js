import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  findUserById,
  publicUser,
  updateNotificationEmails,
  regenerateViewToken,
  verifyPassword,
  updatePassword,
  AuthError,
} from "@/lib/users";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  return NextResponse.json(publicUser(user));
}

export async function PATCH(request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    if (body.regenerateViewToken) {
      const viewToken = await regenerateViewToken(session.userId);
      const user = await findUserById(session.userId);
      return NextResponse.json({ ...publicUser(user), viewToken });
    }

    if (body.notificationEmails !== undefined) {
      if (!Array.isArray(body.notificationEmails) || !body.notificationEmails.every((e) => typeof e === "string")) {
        return NextResponse.json({ error: "notificationEmails must be a list of strings." }, { status: 422 });
      }
      await updateNotificationEmails(session.userId, body.notificationEmails);
      const user = await findUserById(session.userId);
      return NextResponse.json(publicUser(user));
    }

    if (body.newPassword !== undefined) {
      if (typeof body.currentPassword !== "string") {
        return NextResponse.json({ error: "Current password is required." }, { status: 400 });
      }
      const user = await findUserById(session.userId);
      const valid = await verifyPassword(user, body.currentPassword);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
      }
      await updatePassword(session.userId, body.newPassword);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "No recognized changes were provided." }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
