/**
 * Captures the major screens for each role into docs/screenshots/ (desktop and phone).
 * Needs a running app with seeded demo data.
 * Also exports the phone screens used by the landing page's "From fault to fixed" panel.
 * Usage: npm run screenshots   (BASE_URL defaults to http://localhost:3000)
 */

import { type Browser, type BrowserContext, chromium, devices, type Page } from "@playwright/test";
import sharp from "sharp";

import { mkdirSync, rmSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "docs/screenshots";
const PASSWORD = "Zega@2026!";

type Role = "student" | "staff" | "officer" | "admin";
type Shot = {
  name: string;
  path: string | ((ctx: BrowserContext) => Promise<string>);
  full?: boolean;
  mobile?: boolean;
};

async function firstRef(ctx: BrowserContext, query: string) {
  // Fall back to any visible request if none matches the preferred statuses.
  for (const q of [query, ""]) {
    const res = await ctx.request.get(`${BASE}/api/requests?limit=1&${q}`);
    const body = (await res.json()) as { data: { refCode: string }[] };
    if (body.data[0]) return `/dashboard/requests/${body.data[0].refCode}`;
  }
  throw new Error(`No visible request for ${query}`);
}

// Only the screens that evidence the brief: sign-in, each role's main screen, the submission form,
// tracking, request management with assignment, users, reports and the audit trail.
const PUBLIC: Shot[] = [
  { name: "login", path: "/auth/login" },
  { name: "register", path: "/auth/register" },
];

const BY_ROLE: Record<Role, Shot[]> = {
  student: [
    { name: "dashboard", path: "/dashboard" },
    { name: "report-form", path: "/dashboard/requests/new", mobile: true },
    { name: "tracking", path: (c) => firstRef(c, "status=resolved,closed"), mobile: true },
  ],
  staff: [],
  officer: [{ name: "work-board", path: "/dashboard/work", mobile: true }],
  admin: [
    { name: "dashboard", path: "/dashboard" },
    { name: "requests", path: "/dashboard/admin/requests", mobile: true },
    { name: "request-detail", path: (c) => firstRef(c, "status=submitted") },
    { name: "users", path: "/dashboard/admin/users" },
    { name: "reports", path: "/dashboard/admin/reports" },
    { name: "audit", path: "/dashboard/admin/audit" },
  ],
};

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  // Let charts, fonts and entrance animations finish.
  await page.waitForTimeout(1200);
}

async function capture(browser: Browser, prefix: string, shots: Shot[], email?: string) {
  for (const mobile of [false, true]) {
    const list = mobile ? shots.filter((s) => s.mobile) : shots;
    if (!list.length) continue;
    const ctx = await browser.newContext({
      ...(mobile ? devices["iPhone 14"] : { viewport: { width: 1440, height: 900 } }),
      reducedMotion: "reduce",
      colorScheme: "light",
    });
    if (email) {
      const res = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, {
        data: { email, password: PASSWORD },
        headers: { Origin: BASE },
      });
      if (!res.ok()) throw new Error(`Sign in failed for ${email}: ${res.status()}`);
    }
    const page = await ctx.newPage();
    // Hide the Next.js dev-mode badge when capturing against `npm run dev`.
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal{display:none!important}";
      document.addEventListener("DOMContentLoaded", () => document.head.append(style));
    });
    for (const s of list) {
      const path = typeof s.path === "string" ? s.path : await s.path(ctx);
      // The dev server compiles each route on first visit, which can take a while.
      await page.goto(`${BASE}${path}`, { timeout: 120_000 });
      await settle(page);
      const file = `${OUT}/${prefix}-${s.name}${mobile ? "-mobile" : ""}.png`;
      await page.screenshot({ path: file, fullPage: Boolean(s.full) && !mobile });
      console.log(file);
    }
    await ctx.close();
  }
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  await capture(browser, "public", PUBLIC);
  for (const role of Object.keys(BY_ROLE) as Role[]) {
    await capture(browser, role, BY_ROLE[role], `${role}@zega.test`);
  }
} finally {
  await browser.close();
}

const PHONE_SCREENS = {
  "student-report-form-mobile": "phone-report",
  "student-tracking-mobile": "phone-track",
  "officer-work-board-mobile": "phone-resolve",
};
mkdirSync("public/images", { recursive: true });
for (const [from, to] of Object.entries(PHONE_SCREENS)) {
  await sharp(`${OUT}/${from}.png`).resize({ width: 520 }).webp({ quality: 82 }).toFile(`public/images/${to}.webp`);
  console.log(`public/images/${to}.webp`);
}
