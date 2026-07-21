import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSettings, updateSettings, regenerateViewToken } from "@/lib/settings";

function publicSettings(s) {
  return {
    viewToken: s.viewToken,
    notificationEmails: s.notificationEmails || [],
  };
}

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(publicSettings(settings));
}

export async function PATCH(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const settings = await getSettings();

  // Regenerate the read-only family link. Old link stops working immediately.
  if (body.regenerateViewToken) {
    const token = await regenerateViewToken();
    return NextResponse.json({ ...publicSettings(await getSettings()), viewToken: token });
  }

  // Update the list of email addresses that receive reminders.
  if (body.notificationEmails !== undefined) {
    if (
      !Array.isArray(body.notificationEmails) ||
      !body.notificationEmails.every((e) => typeof e === "string")
    ) {
      return NextResponse.json({ error: "notificationEmails must be a list of strings." }, { status: 422 });
    }
    const emails = body.notificationEmails
      .map((e) => e.trim())
      .filter(Boolean);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = emails.filter((e) => !emailRe.test(e));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `These don't look like valid email addresses: ${invalid.join(", ")}` },
        { status: 422 }
      );
    }
    const updated = await updateSettings({ notificationEmails: emails });
    return NextResponse.json(publicSettings(updated));
  }

  // Change the admin password.
  if (body.newPassword !== undefined) {
    if (typeof body.currentPassword !== "string") {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }
    if (settings.adminPasswordHash) {
      const valid = await bcrypt.compare(body.currentPassword, settings.adminPasswordHash);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
      }
    }
    if (typeof body.newPassword !== "string" || body.newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 422 });
    }
    const hash = await bcrypt.hash(body.newPassword, 12);
    await updateSettings({ adminPasswordHash: hash });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "No recognized changes were provided." }, { status: 400 });
}
