import { NextResponse } from "next/server";
import { createUser, AuthError } from "@/lib/users";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const user = await createUser({
      email: body.email,
      password: body.password,
      householdName: body.householdName,
    });

    const token = await createSessionToken(user._id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }
}
