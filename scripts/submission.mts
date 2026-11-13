/**
 * Builds the single submission PDF: cover, project report (docs/report/report.md), screenshots,
 * testing evidence and the full codebase.
 *
 *   npm run screenshots      # refresh docs/screenshots (needs the app running with demo data)
 *   npm run test:report      # refresh docs/testing
 *   npm run submission       # writes submission/ZEGA-MIT8333.pdf
 *
 * Optional docs/report/meta.json: { "student": "...", "matric": "..." } for the cover page.
 */

import { chromium } from "@playwright/test";
import { marked } from "marked";

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const OUT_DIR = "submission";
const BUILD = `${OUT_DIR}/build`;
const PDF = `${OUT_DIR}/ZEGA-MIT8333.pdf`;
const LIVE = "https://zega-ms.vercel.app";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const read = (p: string) => readFileSync(p, "utf8");
const json = <T,>(p: string): T | null => (existsSync(p) ? (JSON.parse(read(p)) as T) : null);

/* ------------------------------------------------------------------ API table */

type OpenApi = {
  paths: Record<string, Record<string, { summary?: string; tags?: string[]; security?: unknown[] }>>;
};

function apiTable() {
  const doc = json<OpenApi>("docs/api/openapi.json");
  if (!doc) return "<p>Run <code>npm run docs:api</code> to export the OpenAPI document.</p>";
  const byTag = new Map<string, string[]>();
  for (const [path, ops] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      const tag = op.tags?.[0] ?? "Other";
      const row = `<tr><td><span class="method ${method}">${method.toUpperCase()}</span></td><td><code>${esc(path.startsWith("/api") ? path : `/api${path}`)}</code></td><td>${esc(op.summary ?? "")}</td></tr>`;
      byTag.set(tag, [...(byTag.get(tag) ?? []), row]);
    }
  }
  return [...byTag.entries()]
    .map(
      ([tag, rows]) =>
        `<h3>${esc(tag)}</h3><table class="api"><thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead><tbody>${rows.join("")}</tbody></table>`,
    )
    .join("");
}

/* ---------------------------------------------------------------- screenshots */

const SHOTS: { group: string; items: [file: string, caption: string][] }[] = [
  {
    group: "8.1 Public pages",
    items: [
      ["public-landing", "Landing page"],
      ["public-login", "Log in, with one-click demo accounts"],
      ["public-register", "Registration for students and staff, with validation"],
    ],
  },
  {
    group: "8.2 Student and staff",
    items: [
      ["student-dashboard", "Requester dashboard: open requests, items awaiting confirmation and recent activity"],
      ["student-report-form", "Service request submission form (step 1 of 4: category)"],
      ["student-my-requests", "My requests (All tab) with search and category filter"],
      [
        "student-tracking",
        "Request tracking page: status steps, service targets, details, activity timeline and people",
      ],
      ["student-notifications", "In-app notifications"],
      ["student-profile", "Profile: details, email preference and signed-in devices"],
      ["staff-dashboard", "Staff dashboard"],
    ],
  },
  {
    group: "8.3 Maintenance officer",
    items: [
      ["officer-dashboard", "Officer dashboard: today's queue and SLA risk"],
      ["officer-work-board", "Work-order board: drag a job between Assigned, In progress, On hold and Resolved"],
      ["officer-job", "Job page with the actions the lifecycle allows, notes and photos"],
    ],
  },
  {
    group: "8.4 Administrator",
    items: [
      ["admin-dashboard", "Operations dashboard: volume, backlog, SLA compliance, workload and hotspots"],
      ["admin-requests", "Request management: search, filters, sorting, pagination and bulk actions"],
      ["admin-request-detail", "Request detail with triage, assignment and ranked officer suggestions"],
      ["admin-users", "Users and roles, with the permission matrix"],
      ["admin-settings", "Categories and SLA targets"],
      ["admin-locations", "Campus locations and printable QR stickers"],
      ["admin-reports", "Reports with PDF and CSV export"],
      ["admin-audit", "Tamper-evident audit trail with integrity verification"],
    ],
  },
];

function screenshots() {
  const img = (file: string) => pathToFileURL(resolve(`docs/screenshots/${file}.png`)).href;
  const desktop = SHOTS.map(
    (g) =>
      `<h3>${g.group}</h3>${g.items
        .filter(([f]) => existsSync(`docs/screenshots/${f}.png`))
        .map(
          ([f, c], i) =>
            `<figure class="shot"><img src="${img(f)}" alt=""><figcaption>Figure ${g.group.split(" ")[0]}.${i + 1}. ${esc(c)}</figcaption></figure>`,
        )
        .join("")}`,
  ).join("");
  const mobileFiles = SHOTS.flatMap((g) => g.items).filter(([f]) => existsSync(`docs/screenshots/${f}-mobile.png`));
  const mobile = `<h3>8.5 Phone layouts</h3><p>Below 768px the dashboard switches to a phone layout: a top bar with the sidebar button, search and notifications, a bottom tab bar for each role, and cards instead of tables.</p><div class="phones">${mobileFiles
    .map(
      ([f, c]) =>
        `<figure><img src="${img(`${f}-mobile`)}" alt=""><figcaption>${esc(c.split(/[:(]/)[0].trim())}</figcaption></figure>`,
    )
    .join("")}</div>`;
  return desktop + mobile;
}

/* ------------------------------------------------------------ testing evidence */

type VitestResults = {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  startTime: number;
  testResults: { name: string; assertionResults: { status: string; title: string; ancestorTitles: string[] }[] }[];
};
type Coverage = {
  total: Record<"lines" | "statements" | "functions" | "branches", { pct: number; covered: number; total: number }>;
};

function testEvidence() {
  const v = json<VitestResults>("docs/testing/vitest-results.json");
  const cov = json<Coverage>("docs/testing/coverage-summary.json");
  if (!v) return "<p>Run <code>npm run test:report</code> to collect test results.</p>";
  const when = new Date(v.startTime).toISOString().slice(0, 16).replace("T", " ");
  const rows = v.testResults
    .map((f) => {
      const file = f.name.replace(`${ROOT}/`, "");
      const passed = f.assertionResults.filter((a) => a.status === "passed").length;
      let kind = "Unit";
      if (file.startsWith("tests/api")) kind = "API and database";
      else if (file.endsWith(".tsx")) kind = "Component";
      return { file, kind, total: f.assertionResults.length, passed };
    })
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.file.localeCompare(b.file));
  const summary = `<table class="kpi"><tr><td><b>${v.numTotalTests}</b>tests</td><td><b>${v.numPassedTests}</b>passed</td><td><b>${v.numFailedTests}</b>failed</td><td><b>${rows.length}</b>test files</td></tr></table>`;
  const files = `<table><thead><tr><th>Level</th><th>Test file</th><th>Tests</th><th>Passed</th></tr></thead><tbody>${rows
    .map(
      (r) => `<tr><td>${r.kind}</td><td><code>${esc(r.file)}</code></td><td>${r.total}</td><td>${r.passed}</td></tr>`,
    )
    .join("")}</tbody></table>`;
  const coverage = cov
    ? `<h3>Coverage</h3><table><thead><tr><th>Metric</th><th>Covered</th><th>Percentage</th></tr></thead><tbody>${(
        ["statements", "branches", "functions", "lines"] as const
      )
        .map(
          (k) =>
            `<tr><td>${k[0].toUpperCase()}${k.slice(1)}</td><td>${cov.total[k].covered} of ${cov.total[k].total}</td><td>${cov.total[k].pct.toFixed(1)}%</td></tr>`,
        )
        .join(
          "",
        )}</tbody></table><p class="note">Coverage is measured over ZEGA's own logic (domain, server, shared and screen components); pages and layouts are exercised by the end-to-end suite.</p>`
    : "";
  const sample = v.testResults
    .find((f) => f.name.endsWith("tests/api/requests.api.test.ts"))
    ?.assertionResults.map(
      (a) => `<li>${a.status === "passed" ? "✓" : "✗"} ${esc([...a.ancestorTitles, a.title].join(" › "))}</li>`,
    )
    .join("");
  const e2e = e2eEvidence();
  return `<h3>Unit, API and component tests</h3><p>Vitest run of ${when} UTC (<code>npm run test:report</code>).</p>${summary}${files}${coverage}${
    sample ? `<h3>API test cases (tests/api/requests.api.test.ts)</h3><ul class="cases">${sample}</ul>` : ""
  }${e2e}`;
}

function e2eEvidence() {
  type PwSuite = {
    title: string;
    specs?: { title: string; tests: { projectName: string; results: { status: string }[] }[] }[];
    suites?: PwSuite[];
  };
  const pw = json<{
    stats: { expected: number; unexpected: number; skipped: number; startTime: string };
    suites: PwSuite[];
  }>("docs/testing/playwright-results.json");
  if (pw) {
    const rows: string[] = [];
    const walk = (s: PwSuite, file: string) => {
      for (const spec of s.specs ?? [])
        for (const t of spec.tests)
          rows.push(
            `<tr><td><code>${esc(file)}</code></td><td>${esc(spec.title)}</td><td>${t.projectName}</td><td>${t.results.at(-1)?.status ?? "skipped"}</td></tr>`,
          );
      for (const child of s.suites ?? []) walk(child, file);
    };
    for (const s of pw.suites) walk(s, s.title);
    return `<h3>End-to-end tests (Playwright)</h3><p>Run of ${pw.stats.startTime.slice(0, 16).replace("T", " ")} UTC: <b>${pw.stats.expected}</b> passed, <b>${pw.stats.unexpected}</b> failed, <b>${pw.stats.skipped}</b> skipped (desktop-only or phone-only scenarios are skipped on the other profile).</p><table><thead><tr><th>Spec</th><th>Scenario</th><th>Profile</th><th>Result</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  }
  return "";
}

/* -------------------------------------------------------------------- health */

async function health() {
  try {
    const res = await fetch(`${LIVE}/api/health`, { signal: AbortSignal.timeout(15000) });
    const body = await res.text();
    return `<pre class="code-block">$ curl ${LIVE}/api/health\n${esc(JSON.stringify(JSON.parse(body), null, 2))}</pre>`;
  } catch {
    return `<p>Open <a href="${LIVE}/api/health">${LIVE}/api/health</a> to see the live result.</p>`;
  }
}

/* ------------------------------------------------------------------ codebase */

const EXCLUDE = [
  /^package-lock\.json$/,
  /\.(png|jpe?g|webp|gif|ico|mp4|webm|woff2?|ttf|pdf)$/i,
  /^docs\/(api|testing|screenshots)\//,
  /^drizzle\/meta\//,
  /^src\/styles\/flag-icons\//,
  /^(LICENSE|NOTICE)$/,
  /(^|\/)\.gitkeep$/,
];

/** Application code first, then tests, database, scripts, configuration and documentation. */
const ORDER = [
  /^src\//,
  /^tests\//,
  /^drizzle\//,
  /^scripts\//,
  /^public\//,
  /^[^/]+\.(ts|mts|mjs|json)$/,
  /^\.github\//,
];
const rank = (f: string) => {
  const i = ORDER.findIndex((re) => re.test(f));
  return i === -1 ? ORDER.length : i;
};

function codebase() {
  const files = execSync("git ls-files", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((f) => !EXCLUDE.some((re) => re.test(f)) && existsSync(f) && statSync(f).size < 200_000)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  let lines = 0;
  const body = files
    .map((f, i) => {
      const src = read(f).replace(/\t/g, "  ").replace(/\n$/, "");
      const rows = src.split("\n");
      lines += rows.length;
      return `<section class="file" id="f${i}"><h3 class="file-name">${esc(f)} <span>${rows.length} lines</span></h3><pre class="src">${rows
        .map((l) => `<span>${esc(l) || " "}</span>`)
        .join("")}</pre></section>`;
    })
    .join("");
  const index = `<ol class="file-index">${files.map((f, i) => `<li><a href="#f${i}">${esc(f)}</a></li>`).join("")}</ol>`;
  return { html: body, index, count: files.length, lines };
}

/* ---------------------------------------------------------------- document */

const CSS = `
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
html { font-family: Inter, system-ui, sans-serif; font-size: 10.5pt; color: #0f172a; line-height: 1.55; }
body { margin: 0; }
h1 { font-size: 20pt; margin: 28pt 0 12pt; color: #001e40; letter-spacing: -0.02em; break-after: avoid; }
h1.page { break-before: page; margin-top: 0; }
h2 { font-size: 13.5pt; margin: 18pt 0 6pt; color: #001e40; break-after: avoid; }
h3 { font-size: 11.5pt; margin: 14pt 0 6pt; break-after: avoid; }
p, li { orphans: 3; widows: 3; }
a { color: #246cff; text-decoration: none; }
code { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.86em; background: #f1f5f9; padding: 0 3px; border-radius: 3px; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 9pt; break-inside: auto; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th, td { border: 1px solid #e2e8f0; padding: 4pt 6pt; text-align: left; vertical-align: top; }
th { background: #f1f5f9; font-weight: 600; }
pre.code-block, pre:not(.src):not(.mermaid) { background: #0f172a; color: #e2e8f0; padding: 8pt 10pt; border-radius: 6px; font-size: 8.5pt; white-space: pre-wrap; break-inside: avoid; }
pre:not(.src):not(.mermaid) code { background: none; color: inherit; padding: 0; }
pre.mermaid { text-align: center; background: none; break-inside: avoid; margin: 10pt 0; }
pre.mermaid svg { max-width: 100%; max-height: 200mm; height: auto; }
.cover { display: flex; flex-direction: column; justify-content: space-between; height: 252mm; padding: 18mm 4mm 4mm; border-top: 10pt solid #001e40; }
.cover .brand { font-size: 64pt; font-weight: 800; letter-spacing: -0.04em; line-height: 1; color: #001e40; }
.cover .tag { font-size: 16pt; color: #246cff; margin-top: 8pt; }
.cover .title { font-size: 22pt; font-weight: 700; margin-top: 30mm; line-height: 1.25; color: #0f172a; }
.cover .meta { font-size: 11pt; color: #475569; line-height: 1.8; border-top: 1px solid #e2e8f0; padding-top: 10pt; }
.cover .meta b { color: #0f172a; }
.toc { list-style: none; padding: 0; font-size: 11pt; }
.toc li { padding: 4pt 0; border-bottom: 1px dotted #cbd5e1; }
.toc li.sub { padding-left: 14pt; font-size: 10pt; color: #475569; }
.method { font-family: ui-monospace, monospace; font-size: 8pt; font-weight: 700; padding: 1px 5px; border-radius: 3px; color: white; }
.method.get { background: #0f766e; } .method.post { background: #246cff; } .method.patch { background: #b45309; } .method.put { background: #7c3aed; } .method.delete { background: #b91c1c; }
table.api td:first-child { width: 58pt; } table.api td:nth-child(2) { width: 45%; }
figure.shot { margin: 8pt 0 16pt; break-inside: avoid; }
figure.shot img { width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; display: block; }
figure.shot img[src*="dashboard.png"], figure.shot img { max-height: 225mm; object-fit: contain; object-position: top; }
figcaption { font-size: 8.5pt; color: #475569; margin-top: 4pt; }
.phones { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10pt; }
.phones figure { margin: 0; break-inside: avoid; }
.phones img { width: 100%; border: 1px solid #e2e8f0; border-radius: 10px; display: block; }
table.kpi td { text-align: center; font-size: 9pt; color: #475569; }
table.kpi b { display: block; font-size: 18pt; color: #001e40; }
ul.cases { columns: 1; font-size: 8.5pt; padding-left: 12pt; list-style: none; }
.note { font-size: 8.5pt; color: #475569; }
.file-index { columns: 2; font-size: 7.5pt; font-family: ui-monospace, monospace; padding-left: 22pt; }
.file { break-inside: auto; margin-bottom: 10pt; }
.file-name { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 8.5pt; background: #001e40; color: white; padding: 4pt 8pt; border-radius: 4px 4px 0 0; margin: 10pt 0 0; break-after: avoid; }
.file-name span { float: right; color: #9cc0ff; font-weight: 400; }
pre.src { margin: 0; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 6.8pt; line-height: 1.4; white-space: pre-wrap; word-break: break-all; counter-reset: ln; border: 1px solid #e2e8f0; border-top: 0; padding: 4pt 6pt 4pt 0; }
pre.src span { display: block; padding-left: 34pt; text-indent: -28pt; }
pre.src span::before { counter-increment: ln; content: counter(ln); display: inline-block; width: 22pt; margin-right: 6pt; text-align: right; color: #94a3b8; }
`;

async function main() {
  mkdirSync(BUILD, { recursive: true });
  const meta = json<{ student?: string; matric?: string }>("docs/report/meta.json") ?? {};
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  let report = await marked.parse(read("docs/report/report.md"));
  report = report
    .replace(
      /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (_, src: string) => `<pre class="mermaid">${src}</pre>`,
    )
    .replace("<p><!-- API_TABLE --></p>", apiTable())
    .replace("<!-- API_TABLE -->", apiTable())
    .replace(/(<p>)?<!-- SCREENSHOTS -->(<\/p>)?/, screenshots())
    .replace(/(<p>)?<!-- TEST_EVIDENCE -->(<\/p>)?/, testEvidence())
    .replace(/(<p>)?<!-- HEALTH -->(<\/p>)?/, await health())
    // Start the report and its larger sections on a new page; short sections flow on.
    .replace(/<h1>(1|3|5|7|8|9|10)\. /g, '<h1 class="page">$1. ');

  const code = codebase();
  const sections = [...read("docs/report/report.md").matchAll(/^(#{1,2}) (.+)$/gm)].map(
    ([, level, title]) => `<li class="${level === "##" ? "sub" : ""}">${esc(title)}</li>`,
  );

  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>ZEGA: MIT 8333 submission</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<section class="cover">
  <div><div class="brand">ZEGA</div><div class="tag">Report it. Track it. Resolve it.</div>
  <div class="title">A university maintenance and service request platform</div></div>
  <div class="meta">
    <div><b>MIT 8333</b> Advanced Web Application Development (Virtual lab)</div>
    <div>Continuous Assessment, 2026/2027 Academic Session</div>
    ${meta.student ? `<div><b>Student:</b> ${esc(meta.student)}</div>` : ""}
    ${meta.matric ? `<div><b>Matric number:</b> ${esc(meta.matric)}</div>` : ""}
    <div><b>Live application:</b> ${LIVE}</div>
    <div><b>Date:</b> ${date}</div>
  </div>
</section>
<h1 class="page">Contents</h1>
<p>This document contains, in order: the project report (sections 1 to 12, including screenshots of the
major interfaces in section 8 and testing evidence in section 9), followed by the complete codebase in
Appendix A (${code.count} files, ${code.lines.toLocaleString("en-GB")} lines).</p>
<ol class="toc">${sections.join("")}<li>Appendix A. Codebase</li></ol>
${report}
<h1 class="page">Appendix A. Codebase</h1>
<p>Every source, configuration, migration, test, script and documentation file tracked in the repository,
excluding binary assets (images, video, fonts), the npm lockfile, generated files (OpenAPI export, Drizzle
snapshots, test output) and the vendored flag icon stylesheet. Files are listed below and printed in the same order.</p>
${code.index}
${code.html}
<script type="module">
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad: false, theme: "neutral", fontFamily: "Inter, sans-serif", flowchart: { htmlLabels: true } });
try { await mermaid.run({ querySelector: "pre.mermaid" }); } finally { window.__mermaidDone = true; }
</script>
</body></html>`;

  const htmlPath = resolve(`${BUILD}/submission.html`);
  writeFileSync(htmlPath, html);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle", timeout: 180_000 });
    await page.waitForFunction(() => (window as unknown as { __mermaidDone?: boolean }).__mermaidDone, null, {
      timeout: 60_000,
    });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: PDF,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;font-size:7pt;color:#64748b;padding:0 16mm;display:flex;justify-content:space-between;font-family:Inter,sans-serif"><span>ZEGA · MIT 8333</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      timeout: 600_000,
    });
  } finally {
    await browser.close();
  }
  const mb = (statSync(PDF).size / 1024 / 1024).toFixed(1);
  console.log(`${PDF} (${mb} MB, ${code.count} code files, ${code.lines} lines)`);
}

await main();
