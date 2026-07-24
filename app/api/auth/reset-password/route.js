import { NextResponse } from "next/server";
import { resetPasswordWithToken, AuthError } from "@/lib/users";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    await resetPasswordWithToken(body?.token, body?.newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not reset your password. Please try again." }, { status: 500 });
  }
}
