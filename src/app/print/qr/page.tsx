import { headers } from "next/headers";

import type { Metadata } from "next";
import QRCode from "qrcode";

import { ZegaWordmark } from "@/components/app-logo";
import { db } from "@/server/db";
import { listLocations } from "@/server/services/catalog";
import { requireRole } from "@/server/session";

import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "QR stickers", robots: { index: false, follow: false } };

export default async function QrStickersPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireRole("admin");
  const { ids = "" } = await searchParams;
  const wanted = new Set(ids.split(",").filter(Boolean));
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const locations = (await listLocations(db)).filter((l) => wanted.has(l.id) && l.kind !== "campus");
  const stickers = await Promise.all(
    locations.map(async (l) => ({
      ...l,
      url: `${origin}/r/${l.qrToken}`,
      svg: await QRCode.toString(`${origin}/r/${l.qrToken}`, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#001e40", light: "#ffffff" },
      }),
    })),
  );

  return (
    <main className="mx-auto max-w-[210mm] bg-white p-6 text-[#001e40] print:p-0">
      <style>{`@page { size: A4; margin: 10mm; } @media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="no-print mb-6 flex items-center justify-between rounded-xl border p-4">
        <div>
          <h1 className="text-lg font-semibold">
            {stickers.length} QR sticker{stickers.length === 1 ? "" : "s"}
          </h1>
          <p className="text-sm text-slate-600">
            Print on A4 (or save as PDF), cut out and stick near the door of each room.
          </p>
        </div>
        <PrintButton />
      </div>
      {stickers.length === 0 ? (
        <p className="text-slate-600">No locations selected. Go back and tick the places you want stickers for.</p>
      ) : (
        <div className="grid grid-cols-2 gap-[6mm]">
          {stickers.map((s) => (
            <section
              key={s.id}
              className="flex break-inside-avoid flex-col items-center gap-3 rounded-xl border-2 border-[#246cff] p-5 text-center"
            >
              <ZegaWordmark variant="brand-navy" className="h-6 w-auto" />
              <p className="text-sm font-semibold">Something broken here? Scan to report it.</p>
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG generated server-side by the qrcode library from our own URL */}
              <div className="size-[42mm] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: s.svg }} />
              <div>
                <div className="text-base font-semibold">{s.label}</div>
                <div className="font-mono text-xs text-slate-500">{s.code}</div>
              </div>
              <p className="text-[10px] text-slate-500">No camera app? Visit {s.url.replace(/^https?:\/\//, "")}</p>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
