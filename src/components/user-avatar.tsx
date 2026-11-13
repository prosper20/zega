import { cn } from "cn";

import type { RoleSlug } from "@/domain/constants";

/**
 * Colour families per role, so a person's role is recognisable at a glance while each user still
 * gets a distinct picture. Values are Tailwind palette colours (named alongside each hex).
 */
export const AVATAR_PALETTES: Record<RoleSlug, readonly string[]> = {
  // blue-300, sky-500, blue-600, sky-300, blue-800
  student: ["#93c5fd", "#0ea5e9", "#2563eb", "#7dd3fc", "#1e40af"],
  // emerald-300, emerald-500, teal-600, green-400, teal-800
  staff: ["#6ee7b7", "#10b981", "#0d9488", "#4ade80", "#115e59"],
  // amber-300, amber-500, orange-500, orange-300, orange-700
  officer: ["#fcd34d", "#f59e0b", "#f97316", "#fdba74", "#c2410c"],
  // ZEGA navy, secondary navy, brand blue, brand blue light, rose-500
  admin: ["#001e40", "#003161", "#246cff", "#6996ff", "#f43f5e"],
};

/** FNV-1a: a small, stable string hash. */
function hash(input: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic PRNG seeded from the hash (mulberry32). */
function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type AvatarShape = { cx: number; cy: number; r: number; fill: string; opacity: number };

/** The avatar composition for an id and role: a background and three overlapping shapes. Pure and stable. */
export function avatarComposition(id: string, role: RoleSlug) {
  const palette = AVATAR_PALETTES[role];
  const rnd = random(hash(`${role}:${id}`));
  const pick = () => palette[Math.floor(rnd() * palette.length)];
  const background = pick();
  const shapes: AvatarShape[] = [0, 1, 2].map((i) => {
    let fill = pick();
    while (fill === background) fill = pick();
    return {
      cx: Math.round(10 + rnd() * 60),
      cy: Math.round(10 + rnd() * 60),
      r: Math.round([34, 22, 12][i] + rnd() * 10),
      fill,
      opacity: [0.95, 0.85, 0.9][i],
    };
  });
  const rotation = Math.round(rnd() * 360);
  return { background, shapes, rotation };
}

/** Circular abstract avatar used everywhere a person is shown (no initials, no photos). */
export function UserAvatar({
  id,
  userRole,
  name,
  size = 32,
  className,
}: {
  id: string;
  userRole: RoleSlug;
  name?: string;
  size?: number;
  className?: string;
}) {
  const { background, shapes, rotation } = avatarComposition(id, userRole);
  const clipId = `av-${hash(`${userRole}:${id}`).toString(36)}`;
  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      role="img"
      aria-label={name ? `${name}` : "User"}
      className={cn("shrink-0 rounded-full", className)}
    >
      <title>{name ?? "User"}</title>
      <defs>
        <clipPath id={clipId}>
          <circle cx="40" cy="40" r="40" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="80" height="80" fill={background} />
        <g transform={`rotate(${rotation} 40 40)`}>
          {shapes.map((s, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed three-shape composition
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.opacity} />
          ))}
        </g>
      </g>
    </svg>
  );
}
