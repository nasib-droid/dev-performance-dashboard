import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isValidSession } from "@/lib/session";

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/login")) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (await isValidSession(cookie)) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Excludes Next internals, favicon, and any static asset file (images, icons)
  // under /public — those aren't sensitive and need to load before login too.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp)$).*)"],
};
