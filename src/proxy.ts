import { type NextRequest, NextResponse } from "next/server";

import { getSessionCookie } from "better-auth/cookies";

// Cookie presence only; real session and role checks happen on the server.
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
