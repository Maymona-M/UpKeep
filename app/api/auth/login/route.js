import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { password } = body || {};
  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const settings = await getSettings();
  if (!settings.adminPasswordHash) {
    return NextResponse.json(
      {
        error:
          "No admin password is set up yet. Set ADMIN_PASSWORD_HASH in your .env file (see .env.example and scripts/hash-password.js).",
      },
      { status: 500 }
    );
  }

  const valid = await bcrypt.compare(password, settings.adminPasswordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
