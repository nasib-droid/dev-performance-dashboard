import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isValidSession } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /feedback/<card>/<sig> is public; the page and its action check the signed link themselves.
  if (pathname.startsWith("/login") || pathname.startsWith("/feedback/")) return NextResponse.next();

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
