import { chromium } from "@playwright/test";
const [,, url, out, w = "1440", h = "900", full = "0"] = process.argv;
const b = await chromium.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell" });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
await p.screenshot({ path: out, fullPage: full === "1" }); await b.close();
