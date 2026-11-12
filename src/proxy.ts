import { type NextRequest, NextResponse } from "next/server";

import { getSessionCookie } from "better-auth/cookies";

/**
 * Fast, optimistic routing based on the presence of the session cookie.
 * Real authorisation (session validity and role) happens on the server in
 * requireUser / requireRole and in the API middleware. Signed-in users visiting /auth are
 * redirected by the auth layout after a real session check, so a stale cookie cannot loop.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (pathname.startsWith("/dashboard") && !hasSession) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
