import type { SVGProps } from "react";

import { cn } from "cn";

/**
 * ZEGA "ZE" glyphs, drawn in the manner of printed Ge'ez fidel letterforms:
 * heavy stems with thin horizontals, flat slab terminals and small feet.
 * The ring at the foot of the E is the fidel vowel marker that turns
 * the letter "za" into "ze".
 */
function zeGlyphs(color: string, scale = 1) {
  const thin = 3.2 * scale;
  const thick = 5.6 * scale;
  return (
    <g fill="none" stroke={color} strokeLinejoin="round">
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
export function AppLogo({ className, tile = "currentColor", ...props }: SVGProps<SVGSVGElement> & { tile?: string }) {
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
      <rect width="64" height="64" rx="15" fill={tile} />
      <g transform="translate(5 12.5) scale(0.9)">{zeGlyphs("white", 1.1)}</g>
    </svg>
  );
}

/** Bare glyph wordmark in currentColor, for headers and the footer. */
export function ZeMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" aria-hidden="true" className={className} {...props}>
      {zeGlyphs("currentColor")}
    </svg>
  );
}

const WORDMARK_VARIANTS = {
  /** Inherits the surrounding text colour (default; matches body text). */
  ink: { main: "", ring: "" },
  /** Brand blue. */
  brand: { main: "text-primary", ring: "" },
  /** Brand blue letters with a navy vowel ring. */
  "brand-navy": { main: "text-primary", ring: "text-secondary-foreground" },
  /** Navy letters with a blue vowel ring. */
  navy: { main: "text-secondary-foreground", ring: "text-primary" },
  /** White, for navy or blue backgrounds. */
  inverse: { main: "text-white", ring: "" },
  /** White letters with a green vowel ring, for blue backgrounds. */
  "inverse-accent": { main: "text-white", ring: "text-chart-2" },
} as const;

export type WordmarkVariant = keyof typeof WORDMARK_VARIANTS;

/**
 * Full "ZEGA" wordmark in the same fidel-inspired letterforms as the ZE mark.
 * The A follows the shape of the fidel letter "la": two heavy legs with small feet.
 * Use `compact` below ~28px tall to thicken the hairlines.
 */
export function ZegaWordmark({
  variant = "ink",
  compact = false,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { variant?: WordmarkVariant; compact?: boolean }) {
  const v = WORDMARK_VARIANTS[variant];
  const thin = compact ? 3.9 : 3.2;
  const thick = compact ? 6.2 : 5.6;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="3 5 118 31"
      role="img"
      aria-label="ZEGA"
      className={cn(v.main, className)}
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeLinejoin="round">
        {/* Z */}
        <path d="M6 13 V8.5 H23" strokeWidth={thin} />
        <path d="M22.2 9 L9.2 31" strokeWidth={thick} />
        <path d="M8 31 H25 V27" strokeWidth={thin} />
        {/* E */}
        <path d="M36 8.5 V31" strokeWidth={thick} />
        <path d="M31.5 31 H49" strokeWidth={thin} />
        <path d="M36 8.5 H51 V12.5" strokeWidth={thin} />
        <path d="M36 19.8 H46" strokeWidth={thin} />
        {/* G */}
        <path d="M68 8.5 V31" strokeWidth={thick} />
        <path d="M68 8.5 H85 V13" strokeWidth={thin} />
        <path d="M63.5 31 H85" strokeWidth={thin} />
        <path d="M85 31.5 V20" strokeWidth={thick} />
        <path d="M77 20 H85" strokeWidth={thin} />
        {/* A */}
        <path d="M96 31 L105.5 8.5 L115 31" strokeWidth={thick} />
        <path d="M100 22.5 H111" strokeWidth={thin} />
        <path d="M92 31 H99" strokeWidth={thin} />
        <path d="M112 31 H119" strokeWidth={thin} />
      </g>
      {/* vowel ring on the E */}
      <circle
        cx="52.3"
        cy="31"
        r="3.3"
        fill="none"
        stroke="currentColor"
        strokeWidth={compact ? 3.4 : 3}
        className={v.ring}
      />
    </svg>
  );
}
