import { type NextRequest, NextResponse } from "next/server";

/**
 * Short link printed on QR stickers (e.g. https://zega.app/r/9f2c1a7b3d4e).
 * Opens the report form with the room pre-selected; signed-out users go via login and come back.
 */
export function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return params.then(({ token }) => {
    const safe = token.replace(/[^a-z0-9]/gi, "").slice(0, 40);
    return NextResponse.redirect(new URL(`/dashboard/requests/new?qr=${safe}`, request.url));
  });
}
