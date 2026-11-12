import type { SVGProps } from "react";

/** ZEGA mark: a "Z" stroke inside a rounded work-order tile with a resolution tick. */
export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={32} height={32} aria-hidden="true" {...props}>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="currentColor" />
      <path
        d="M9 10h13L10 22h13"
        fill="none"
        stroke="var(--primary-foreground, #fff)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
