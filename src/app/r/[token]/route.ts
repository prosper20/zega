import { type NextRequest, NextResponse } from "next/server";

// QR sticker short link: opens the report form for that room.
export function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return params.then(({ token }) => {
    const safe = token.replace(/[^a-z0-9]/gi, "").slice(0, 40);
    return NextResponse.redirect(new URL(`/dashboard/requests/new?qr=${safe}`, request.url));
  });
}
