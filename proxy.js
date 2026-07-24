import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth";

async function getSessionUserId(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload?.sub || null;
  } catch {
    return null;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = pathname.startsWith("/dashboard");
  const isProtectedApi =
    pathname.startsWith("/api/obligations") || pathname.startsWith("/api/settings");

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const userId = await getSessionUserId(request);

  if (userId) return NextResponse.next();

  if (isProtectedApi) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/obligations/:path*", "/api/settings/:path*"],
};
