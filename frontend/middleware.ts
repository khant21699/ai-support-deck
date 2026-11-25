import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cheap gate: the API sets an httpOnly "session" cookie. The API still enforces auth on every request;
// this only redirects logged-out visitors to /login.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/inbox/:path*", "/tickets/:path*", "/kb/:path*", "/dashboard/:path*"],
};
