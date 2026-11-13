import { OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "ZEGA: campus maintenance requests, reported, tracked and resolved";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "Campus maintenance, reported, tracked and resolved.",
    subline: "Students and staff report faults with photos. Officers fix them. Every step is on record.",
  });
}
