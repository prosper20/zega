import type { SVGProps } from "react";

import { cn } from "cn";

/**
 * ZEGA "ZE" glyphs, drawn in the manner of printed Ge'ez fidel letterforms:
 * heavy stems with thin horizontals, flat slab terminals and small feet.
 * The ring at the foot of the E is the fidel vowel marker that turns
 * the letter "za" into "ze".
 */
function ZeGlyphs({ scale = 1 }: { scale?: number }) {
  const thin = 3.2 * scale;
  const thick = 5.6 * scale;
  return (
    <g fill="none" stroke="currentColor" strokeLinejoin="round">
      <path d="M6 13 V8.5 H23" strokeWidth={thin} />
      <path d="M22.2 9 L9.2 31" strokeWidth={thick} />
      <path d="M8 31 H25 V27" strokeWidth={thin} />
      <path d="M36 8.5 V31" strokeWidth={thick} />
      <path d="M31.5 31 H49" strokeWidth={thin} />
      <path d="M36 8.5 H51 V12.5" strokeWidth={thin} />
      <path d="M36 19.8 H46" strokeWidth={thin} />
      <circle cx="52.3" cy="31" r="3.3" strokeWidth={3 * scale} />
    </g>
  );
}

/** Square app mark: ZE glyphs knocked out of a rounded brand tile. */
export function AppLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={32}
      height={32}
      aria-hidden="true"
      className={cn("text-primary", className)}
      {...props}
    >
      <rect width="64" height="64" rx="15" fill="currentColor" />
      <g transform="translate(5 12.5) scale(0.9)" color="white">
        <ZeGlyphs scale={1.1} />
      </g>
    </svg>
  );
}

/** Bare glyph wordmark in currentColor, for headers and the footer. */
export function ZeMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" aria-hidden="true" className={className} {...props}>
      <ZeGlyphs />
    </svg>
  );
}
