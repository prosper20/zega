import { OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "Create a ZEGA account to report campus faults";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    headline: "Report a campus fault in under a minute.",
    subline: "Create your student or staff account and follow every request until it is fixed.",
  });
}
