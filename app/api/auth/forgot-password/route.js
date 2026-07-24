import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/users";
import { sendPasswordResetEmail, isEmailConfigured } from "@/lib/mailer";

const GENERIC_MESSAGE = "If an account exists for that email, a reset link has been sent.";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = String(body?.email || "").trim();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const rawToken = await createPasswordResetToken(email);

  if (rawToken) {
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${rawToken}`;

    if (isEmailConfigured()) {
      await sendPasswordResetEmail({ to: email, resetUrl });
    } else {
      // No SMTP configured - never put the raw token in the HTTP response
      // (that would let anyone reset anyone's password just by knowing
      // their email). Log it server-side instead so the account owner -
      // who has access to these logs during local dev / their own
      // deployment - can still complete the flow.
      console.log(`[UpKeep] Password reset requested for ${email}. Reset link: ${resetUrl}`);
    }
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
