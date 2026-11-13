/**
 * Builds the submission documents from docs/report/report.md:
 *   submission/ZEGA-MIT8333.pdf   (cover, report, screenshots, key test evidence, codebase guide)
 *   submission/ZEGA-MIT8333.docx  (the same content as an editable Word document)
 *
 *   npm run screenshots      # refresh docs/screenshots (needs the app running with demo data)
 *   npm run test:report      # refresh docs/testing
 *   npm run submission
 *
 * Cover details come from docs/report/meta.json: { "student", "studentId", "email" }.
 * The full source code is linked (public GitHub repository) rather than printed.
 */

import { chromium } from "@playwright/test";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  type ParagraphChild,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { marked, type Token, type Tokens } from "marked";
import sharp from "sharp";

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const OUT_DIR = "submission";
const BUILD = `${OUT_DIR}/build`;
const NAME = "ZEGA-MIT8333";
const LIVE = "https://zega-ms.vercel.app";
const REPO = "https://github.com/prosper20/zega";
const SCREENSHOTS_MARK = "<!-- SCREENSHOTS -->";

type Meta = { student?: string; studentId?: string; email?: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const read = (p: string) => readFileSync(p, "utf8");
const json = <T,>(p: string): T | null => (existsSync(p) ? (JSON.parse(read(p)) as T) : null);
const cell = (s: string) => s.replace(/\|/g, "\\|");

/** Cover lines shared by the PDF and Word versions: [label, value]. */
function coverLines(meta: Meta, date: string): [string, string][] {
  return [
    ["MIT 8333", "Advanced Web Application Development (Virtual lab)"],
    ["", "Continuous Assessment, 2026/2027 Academic Session"],
    ...(meta.student ? ([["Student:", meta.student]] as [string, string][]) : []),
    ...(meta.studentId ? ([["Student ID:", meta.studentId]] as [string, string][]) : []),
    ...(meta.email ? ([["Email:", meta.email]] as [string, string][]) : []),
    ["Live application:", LIVE],
    ["Source code:", REPO],
    ["Date:", date],
  ];
}

/* ------------------------------------------------------------ screenshots */

type Shot = { file: string; caption: string; figure: string };

const SHOTS: { group: string; items: [file: string, caption: string][] }[] = [
  {
    group: "8.1 Registration and login",
    items: [
      ["public-login", "Log in, with one-click demo accounts"],
      ["public-register", "Registration for students and staff, with validation"],
    ],
  },
  {
    group: "8.2 Student and staff",
    items: [
      ["student-dashboard", "Requester dashboard: open requests, items awaiting confirmation and recent activity"],
      ["student-report-form", "Service request submission form (step 1 of 4: category)"],
      ["student-tracking", "Request tracking page: progress, service targets, details and activity timeline"],
    ],
  },
  {
    group: "8.3 Maintenance officer",
    items: [["officer-work-board", "Work-order board: drag a job between Assigned, In progress, On hold and Resolved"]],
  },
  {
    group: "8.4 Administrator",
    items: [
      ["admin-dashboard", "Operations dashboard: volume, backlog, SLA compliance and status breakdown"],
      ["admin-requests", "Request management: search, filters, sorting, pagination and bulk actions"],
      ["admin-request-detail", "Request detail with triage, assignment and ranked officer suggestions"],
      ["admin-users", "User and role management, with the permission matrix"],
      ["admin-reports", "Reports with PDF and CSV export"],
      ["admin-audit", "Tamper-evident audit trail with integrity verification"],
    ],
  },
];
const PHONE_NOTE =
  "Below 768px the dashboard switches to a phone layout: a top bar with the sidebar button and search, a bottom tab bar for each role (with notifications, and Report in the centre for requesters), and cards instead of tables.";

type Shots = { groups: { title: string; shots: Shot[] }[]; phones: Shot[] };

/** Compressed JPEG copies keep both documents small. */
async function prepareShots(): Promise<Shots> {
  mkdirSync(`${BUILD}/img`, { recursive: true });
  const groups: Shots["groups"] = [];
  const phones: Shot[] = [];
  for (const g of SHOTS) {
    const shots: Shot[] = [];
    for (const [name, caption] of g.items) {
      const src = `docs/screenshots/${name}.png`;
      if (existsSync(src)) {
        const file = `${BUILD}/img/${name}.jpg`;
        await sharp(src)
          .resize({ width: 1440, withoutEnlargement: true })
          .jpeg({ quality: 76, mozjpeg: true })
          .toFile(file);
        shots.push({ file, caption, figure: `Figure ${g.group.split(" ")[0]}.${shots.length + 1}` });
      }
      const phone = `docs/screenshots/${name}-mobile.png`;
      if (existsSync(phone)) {
        const file = `${BUILD}/img/${name}-mobile.jpg`;
        await sharp(phone).resize({ width: 480 }).jpeg({ quality: 80, mozjpeg: true }).toFile(file);
        phones.push({ file, caption: caption.split(/[:(]/)[0].trim(), figure: "" });
      }
    }
    groups.push({ title: g.group, shots });
  }
  return { groups, phones };
}

/* --------------------------------------------------------- testing evidence */

type VitestResults = {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  startTime: number;
  testResults: { name: string; assertionResults: { status: string; title: string; ancestorTitles: string[] }[] }[];
};
type Coverage = { total: Record<"lines" | "statements" | "functions" | "branches", { pct: number }> };
type PwSuite = {
  title: string;
  specs?: { title: string; tests: { projectName: string; results: { status: string }[] }[] }[];
  suites?: PwSuite[];
};

/** The cases that best evidence the brief's requirements; the complete results live in docs/testing. */
const KEY_CASES = [
  "rejects anonymous calls with an RFC 9457 problem",
  "reports validation errors per field",
  "shows officers only jobs that are or were theirs",
  "paginates with a keyset cursor without gaps or repeats",
  "blocks students and officers from assigning, and rejects invalid moves",
  "assigns an officer, who then works and resolves the job",
  "records every step on the audit trail with the right actors",
  "pushes a status change and a notification to the requester, and nothing to unrelated users",
  "guides the reporter through category, place and details, validating each step",
  "only offers moves the lifecycle allows, and asks for a note where required",
];

function levelOf(file: string) {
  if (file.startsWith("tests/api")) return "API and database";
  if (file.endsWith(".tsx")) return "Component";
  return "Unit";
}

function e2eEvidence(): string[] {
  const pw = json<{
    stats: { expected: number; unexpected: number; skipped: number; startTime: string };
    suites: PwSuite[];
  }>("docs/testing/playwright-results.json");
  if (!pw) return [];
  const rows = new Map<string, Record<string, string>>();
  const walk = (s: PwSuite) => {
    for (const spec of s.specs ?? [])
      for (const t of spec.tests) {
        const passed = t.results.at(-1)?.status === "passed";
        rows.set(spec.title, { ...rows.get(spec.title), [t.projectName]: passed ? "Passed" : "Not run" });
      }
    for (const c of s.suites ?? []) walk(c);
  };
  for (const s of pw.suites) walk(s);
  const when = pw.stats.startTime.slice(0, 16).replace("T", " ");
  return [
    "",
    "### End-to-end tests (Playwright)",
    "",
    `Run of ${when} UTC: **${pw.stats.expected} passed**, ${pw.stats.unexpected} failed, ${pw.stats.skipped} not run (desktop-only or phone-only scenarios on the other profile).`,
    "",
    "| Scenario | Desktop Chrome | Pixel 7 phone |",
    "| --- | --- | --- |",
    ...[...rows].map(([title, r]) => `| ${cell(title)} | ${r.desktop ?? "Not run"} | ${r.mobile ?? "Not run"} |`),
  ];
}

function testEvidence() {
  const v = json<VitestResults>("docs/testing/vitest-results.json");
  if (!v) return "Run `npm run test:report` to collect test results.";
  const cov = json<Coverage>("docs/testing/coverage-summary.json");
  const when = new Date(v.startTime).toISOString().slice(0, 16).replace("T", " ");
  const levels = new Map<string, { files: number; tests: number; passed: number }>();
  const cases: string[] = [];
  for (const f of v.testResults) {
    const file = f.name.slice(f.name.indexOf("zega/") + 5);
    const level = levelOf(file);
    const l = levels.get(level) ?? { files: 0, tests: 0, passed: 0 };
    l.files += 1;
    l.tests += f.assertionResults.length;
    l.passed += f.assertionResults.filter((a) => a.status === "passed").length;
    levels.set(level, l);
    for (const a of f.assertionResults)
      if (KEY_CASES.includes(a.title))
        cases.push(
          `| ${level} | ${cell(a.ancestorTitles.join(" › ") || file)} | ${cell(a.title)} | ${a.status === "passed" ? "Passed" : "Failed"} |`,
        );
  }
  const counts = ["Unit", "API and database", "Component"]
    .map((k) => `${levels.get(k)?.tests ?? 0} ${k.toLowerCase()}`)
    .join(", ");
  const out = [
    `**Vitest** run of ${when} UTC (\`npm run test:report\`): **${v.numPassedTests} of ${v.numTotalTests} tests passed** (${counts}), ${v.numFailedTests} failed.`,
  ];
  if (cov) {
    const pct = (k: keyof Coverage["total"]) => `${cov.total[k].pct.toFixed(1)}%`;
    out.push(
      "",
      `**Coverage** of ZEGA's own logic: statements ${pct("statements")}, branches ${pct("branches")}, functions ${pct("functions")}, lines ${pct("lines")}. Pages and layouts are exercised by the end-to-end suite.`,
    );
  }
  out.push("", "### Key test cases", "", "| Level | Area | Test | Result |", "| --- | --- | --- | --- |", ...cases);
  out.push(...e2eEvidence());
  out.push("", "The complete results (JUnit XML, JSON and coverage) are in `docs/testing/` in the repository.");
  return out.join("\n");
}

async function health() {
  try {
    const res = await fetch(`${LIVE}/api/health`, { signal: AbortSignal.timeout(15000) });
    return `\`\`\`text\n$ curl ${LIVE}/api/health\n${JSON.stringify(await res.json(), null, 2)}\n\`\`\``;
  } catch {
    return `Open <${LIVE}/api/health> to see the live result.`;
  }
}

async function assemble() {
  return read("docs/report/report.md")
    .replace("<!-- TEST_EVIDENCE -->", testEvidence())
    .replace("<!-- HEALTH -->", await health());
}

const headings = (md: string) =>
  [...md.matchAll(/^(#{1,2}) (.+)$/gm)]
    .filter(([, , t]) => /^(\d|A)/.test(t))
    .map(([, l, t]) => ({ level: l.length, text: t }));

/** Larger sections start on a new page; short ones flow on. */
const PAGE_BREAK = /^(1|7|8|Appendix A)\b/;
const breaksBefore = (depth: number, text: string) =>
  (depth === 1 && PAGE_BREAK.test(text)) || text.startsWith("7.1 Navigating");

/* ---------------------------------------------------------------------- PDF */

const CSS = `
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
html { font-family: Inter, system-ui, sans-serif; font-size: 10.5pt; color: #0f172a; line-height: 1.55; }
body { margin: 0; }
h1 { font-size: 20pt; margin: 28pt 0 12pt; color: #001e40; letter-spacing: -0.02em; break-after: avoid; }
h2 { font-size: 13.5pt; margin: 18pt 0 6pt; color: #001e40; break-after: avoid; }
h3 { font-size: 11.5pt; margin: 14pt 0 6pt; break-after: avoid; }
.page { break-before: page; margin-top: 0; }
p, li { orphans: 3; widows: 3; }
a { color: #246cff; text-decoration: none; }
code { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.86em; background: #f1f5f9; padding: 0 3px; border-radius: 3px; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 9pt; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th, td { border: 1px solid #e2e8f0; padding: 4pt 6pt; text-align: left; vertical-align: top; }
th { background: #f1f5f9; font-weight: 600; }
pre:not(.mermaid) { background: #0f172a; color: #e2e8f0; padding: 8pt 10pt; border-radius: 6px; font-size: 8.5pt; white-space: pre-wrap; break-inside: avoid; }
pre:not(.mermaid) code { background: none; color: inherit; padding: 0; }
pre.mermaid { text-align: center; background: none; break-inside: avoid; margin: 10pt 0; }
pre.mermaid svg { max-width: 100%; max-height: 190mm; height: auto; }
.cover { display: flex; flex-direction: column; justify-content: space-between; height: 252mm; padding: 18mm 4mm 4mm; border-top: 10pt solid #001e40; }
.cover .brand { font-size: 64pt; font-weight: 800; letter-spacing: -0.04em; line-height: 1; color: #001e40; }
.cover .tag { font-size: 16pt; color: #246cff; margin-top: 8pt; }
.cover .title { font-size: 22pt; font-weight: 700; margin-top: 30mm; line-height: 1.25; }
.cover .meta { font-size: 11pt; color: #475569; line-height: 1.8; border-top: 1px solid #e2e8f0; padding-top: 10pt; }
.cover .meta b { color: #0f172a; }
.toc { list-style: none; padding: 0; font-size: 11pt; }
.toc li { padding: 4pt 0; border-bottom: 1px dotted #cbd5e1; }
.toc li.sub { padding-left: 14pt; font-size: 10pt; color: #475569; }
figure.shot { margin: 8pt 0 16pt; break-inside: avoid; }
figure.shot img { width: 100%; max-height: 215mm; object-fit: contain; object-position: top left; border: 1px solid #e2e8f0; border-radius: 6px; display: block; }
figcaption { font-size: 8.5pt; color: #475569; margin-top: 4pt; }
.phones { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10pt; }
.phones figure { margin: 0; break-inside: avoid; }
.phones img { width: 100%; border: 1px solid #e2e8f0; border-radius: 10px; display: block; }
`;

function screenshotsHtml({ groups, phones }: Shots) {
  const url = (f: string) => pathToFileURL(resolve(f)).href;
  const desktop = groups
    .map(
      (g) =>
        `<h3>${g.title}</h3>${g.shots
          .map(
            (s) =>
              `<figure class="shot"><img src="${url(s.file)}" alt=""><figcaption>${s.figure}. ${esc(s.caption)}</figcaption></figure>`,
          )
          .join("")}`,
    )
    .join("");
  const phone = phones
    .map((s) => `<figure><img src="${url(s.file)}" alt=""><figcaption>${esc(s.caption)}</figcaption></figure>`)
    .join("");
  return `${desktop}<h3>8.5 Phone layouts</h3><p>${PHONE_NOTE}</p><div class="phones">${phone}</div>`;
}

function coverHtml(meta: Meta, date: string) {
  const lines = coverLines(meta, date)
    .map(([k, v]) => `<div>${k ? `<b>${esc(k)}</b> ` : ""}${esc(v)}</div>`)
    .join("");
  return `<section class="cover">
  <div><div class="brand">ZEGA</div><div class="tag">Report it. Track it. Resolve it.</div>
  <div class="title">A university maintenance and service request platform</div></div>
  <div class="meta">${lines}</div>
</section>`;
}

const INTRO =
  "The project report (sections 1 to 12), with screenshots of the major interfaces in section 8 and testing evidence in section 9. Appendix A explains how the codebase is organised; the full source code is at ";

/** Renders the PDF and saves each diagram as a PNG for the Word version. */
async function buildPdf(md: string, shots: Shots, meta: Meta, date: string) {
  const body = (await marked.parse(md))
    .replace(
      /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (_, src: string) => `<pre class="mermaid">${src}</pre>`,
    )
    .replace(/(<p>)?<!-- SCREENSHOTS -->(<\/p>)?/, screenshotsHtml(shots))
    .replace(/<h([12])>([^<]+)<\/h\1>/g, (m, d: string, t: string) =>
      breaksBefore(Number(d), t) ? `<h${d} class="page">${t}</h${d}>` : m,
    );
  const toc = headings(md)
    .map((h) => `<li class="${h.level === 2 ? "sub" : ""}">${esc(h.text)}</li>`)
    .join("");
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>ZEGA: MIT 8333 submission</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
${coverHtml(meta, date)}
<h1 class="page">Contents</h1>
<p>${INTRO}<a href="${REPO}">${REPO}</a>.</p>
<ol class="toc">${toc}</ol>
${body}
<script type="module">
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad: false, theme: "neutral", fontFamily: "Inter, sans-serif" });
try { await mermaid.run({ querySelector: "pre.mermaid" }); } finally { window.__mermaidDone = true; }
</script></body></html>`;
  const htmlPath = resolve(`${BUILD}/submission.html`);
  writeFileSync(htmlPath, html);

  const diagrams: string[] = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 900, height: 1200 } });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForFunction(() => (window as unknown as { __mermaidDone?: boolean }).__mermaidDone, null, {
      timeout: 60_000,
    });
    // Load the web fonts explicitly; printing before they arrive silently falls back to system fonts.
    const fontsOk = await page.evaluate(async () => {
      await Promise.all(
        ["400 16px Inter", "700 16px Inter", "16px 'JetBrains Mono'"].map((f) => document.fonts.load(f)),
      );
      return document.fonts.check("16px Inter");
    });
    if (!fontsOk) throw new Error("Inter did not load (check the network); refusing to print with fallback fonts.");
    const svgs = page.locator("pre.mermaid svg");
    const count = await svgs.count();
    for (let i = 0; i < count; i++) {
      const file = `${BUILD}/img/diagram-${i + 1}.png`;
      await svgs.nth(i).screenshot({ path: file });
      diagrams.push(file);
    }
    await page.pdf({
      path: `${OUT_DIR}/${NAME}.pdf`,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;font-size:7pt;color:#64748b;padding:0 16mm;display:flex;justify-content:space-between;font-family:Inter,sans-serif"><span>ZEGA · MIT 8333</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
  } finally {
    await browser.close();
  }
  return diagrams;
}

/* --------------------------------------------------------------------- DOCX */

const FONT = "Arial";
const MONO = "Consolas";
const NAVY = "001E40";
const BLUE = "246CFF";
const MUTED = "475569";
const CONTENT_DXA = 9026; // A4 width minus 1 inch margins
const CONTENT_PX = 600;
const MAX_PX_HEIGHT = 860;

type RunStyle = { bold?: boolean; italics?: boolean; size?: number; color?: string };

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

const run = (s: string, style: RunStyle = {}) => new TextRun({ text: decode(s), font: FONT, ...style });

function inline(tokens: Token[] | undefined, style: RunStyle = {}): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  for (const t of tokens ?? []) {
    if (t.type === "strong" || t.type === "em") {
      const flag = t.type === "strong" ? { bold: true } : { italics: true };
      out.push(...inline((t as Tokens.Strong).tokens, { ...style, ...flag }));
    } else if (t.type === "codespan") {
      out.push(
        new TextRun({
          text: decode((t as Tokens.Codespan).text),
          font: MONO,
          size: (style.size ?? 21) - 2,
          bold: style.bold,
          shading: { type: ShadingType.CLEAR, color: "auto", fill: "F1F5F9" },
        }),
      );
    } else if (t.type === "link") {
      const l = t as Tokens.Link;
      out.push(
        new ExternalHyperlink({
          link: l.href,
          children: [run(l.text, { ...style, color: BLUE })],
        }),
      );
    } else if (t.type === "br") {
      out.push(new TextRun({ break: 1 }));
    } else if (t.type === "text" && (t as Tokens.Text).tokens?.length) {
      out.push(...inline((t as Tokens.Text).tokens, style));
    } else if (t.type !== "html" && "text" in t) {
      out.push(run(String(t.text), style));
    }
  }
  return out;
}

async function imageRun(file: string, maxWidth = CONTENT_PX, maxHeight = MAX_PX_HEIGHT) {
  const { width = 1, height = 1 } = await sharp(file).metadata();
  // Diagrams are captured at 2x; treat them as half size so they are not upscaled past the page.
  const density = file.includes("diagram-") ? 2 : 1;
  const w = width / density;
  const h = height / density;
  const scale = Math.min(maxWidth / w, maxHeight / h, 1);
  return new ImageRun({
    type: file.endsWith(".png") ? "png" : "jpg",
    data: readFileSync(file),
    transformation: { width: Math.round(w * scale), height: Math.round(h * scale) },
  });
}

const line = { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

function table(t: Tokens.Table) {
  // Column widths follow the longest text in each column, within sensible bounds.
  const weight = t.header.map((h, i) =>
    Math.min(60, Math.max(8, ...[h.text, ...t.rows.map((r) => r[i]?.text ?? "")].map((s) => s.length))),
  );
  const total = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map((w) => Math.floor((w / total) * CONTENT_DXA));
  widths[widths.length - 1] += CONTENT_DXA - widths.reduce((a, b) => a + b, 0);
  const row = (cells: Tokens.TableCell[], header: boolean) =>
    new TableRow({
      tableHeader: header,
      cantSplit: true,
      children: cells.map(
        (c, i) =>
          new TableCell({
            width: { size: widths[i], type: WidthType.DXA },
            borders: { top: line, bottom: line, left: line, right: line },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: "F1F5F9" } : undefined,
            children: [new Paragraph({ children: inline(c.tokens, { size: 17, bold: header || undefined }) })],
          }),
      ),
    });
  return new Table({
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    columnWidths: widths,
    rows: [row(t.header, true), ...t.rows.map((r) => row(r, false))],
  });
}

type Block = Paragraph | Table;
const para = (
  children: ParagraphChild[],
  opts: Omit<ConstructorParameters<typeof Paragraph>[0] & object, "children"> = {},
) => new Paragraph({ spacing: { after: 120, line: 300 }, ...opts, children });

function coverDocx(meta: Meta, date: string): Block[] {
  return [
    para([], {
      border: { top: { style: BorderStyle.SINGLE, size: 48, color: NAVY, space: 1 } },
      spacing: { after: 1200 },
    }),
    para([run("ZEGA", { bold: true, size: 120, color: NAVY })]),
    para([run("Report it. Track it. Resolve it.", { size: 32, color: BLUE })], { spacing: { after: 1400 } }),
    para([run("A university maintenance and service request platform", { bold: true, size: 44 })], {
      spacing: { after: 3000 },
    }),
    ...coverLines(meta, date).map(([k, v]) =>
      para([...(k ? [run(`${k} `, { bold: true, size: 22 })] : []), run(v, { size: 22, color: MUTED })], {
        spacing: { after: 60 },
      }),
    ),
  ];
}

function contentsDocx(md: string): Block[] {
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [run("Contents")] }),
    para([run(INTRO), new ExternalHyperlink({ link: REPO, children: [run(REPO, { color: BLUE })] }), run(".")]),
    ...headings(md).map((h) =>
      para([run(h.text, { size: h.level === 1 ? 22 : 20, color: h.level === 1 ? undefined : MUTED })], {
        indent: { left: h.level === 1 ? 0 : 360 },
        spacing: { after: 60 },
        border: { bottom: { style: BorderStyle.DOTTED, size: 4, color: "CBD5E1", space: 4 } },
      }),
    ),
  ];
}

async function screenshotsDocx({ groups, phones }: Shots): Promise<Block[]> {
  const out: Block[] = [];
  for (const g of groups) {
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [run(g.title)] }));
    for (const s of g.shots) {
      out.push(para([await imageRun(s.file)], { keepNext: true, spacing: { after: 60 } }));
      out.push(para([run(`${s.figure}. ${s.caption}`, { size: 17, color: MUTED })], { spacing: { after: 240 } }));
    }
  }
  out.push(
    new Paragraph({ heading: HeadingLevel.HEADING_3, children: [run("8.5 Phone layouts")] }),
    para([run(PHONE_NOTE)]),
  );
  const perRow = 4;
  const w = Math.floor(CONTENT_DXA / perRow);
  const rows: TableRow[] = [];
  for (let i = 0; i < phones.length; i += perRow) {
    const cells: TableCell[] = [];
    for (let j = 0; j < perRow; j++) {
      const s = phones[i + j];
      cells.push(
        new TableCell({
          width: { size: w, type: WidthType.DXA },
          borders: { top: none, bottom: none, left: none, right: none },
          margins: { top: 80, bottom: 80, left: 60, right: 60 },
          children: s
            ? [
                para([await imageRun(s.file, 140, 400)], { spacing: { after: 40 } }),
                para([run(s.caption, { size: 16, color: MUTED })]),
              ]
            : [para([])],
        }),
      );
    }
    rows.push(new TableRow({ cantSplit: true, children: cells }));
  }
  if (rows.length)
    out.push(
      new Table({ width: { size: CONTENT_DXA, type: WidthType.DXA }, columnWidths: Array(perRow).fill(w), rows }),
    );
  return out;
}

function codeDocx(text: string): Block[] {
  const lines = text.split("\n");
  return lines.map(
    (l, i) =>
      new Paragraph({
        shading: { type: ShadingType.CLEAR, color: "auto", fill: "0F172A" },
        spacing: { after: i === lines.length - 1 ? 160 : 0, line: 260 },
        keepNext: i < lines.length - 1,
        indent: { left: 120, right: 120 },
        children: [new TextRun({ text: l || " ", font: MONO, size: 16, color: "E2E8F0" })],
      }),
  );
}

async function buildDocx(md: string, shots: Shots, diagrams: string[], meta: Meta, date: string) {
  const children: Block[] = [...coverDocx(meta, date), ...contentsDocx(md)];
  const orderedLists: string[] = [];
  let diagram = 0;
  for (const t of marked.lexer(md)) {
    if (t.type === "heading") {
      const h = t as Tokens.Heading;
      const level = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][Math.min(h.depth, 3) - 1];
      children.push(
        new Paragraph({ heading: level, pageBreakBefore: breaksBefore(h.depth, h.text), children: inline(h.tokens) }),
      );
    } else if (t.type === "paragraph") {
      children.push(para(inline((t as Tokens.Paragraph).tokens)));
    } else if (t.type === "list") {
      const l = t as Tokens.List;
      // Each ordered list gets its own numbering instance so it restarts at 1.
      const reference = l.ordered ? `ordered-${orderedLists.push(`ordered-${orderedLists.length + 1}`)}` : "bullets";
      for (const item of l.items) {
        const tokens = item.tokens.flatMap((x) => ("tokens" in x && x.tokens ? x.tokens : [x]));
        children.push(para(inline(tokens), { numbering: { reference, level: 0 }, spacing: { after: 60, line: 300 } }));
      }
    } else if (t.type === "table") {
      children.push(table(t as Tokens.Table), para([], { spacing: { after: 80 } }));
    } else if (t.type === "code") {
      const c = t as Tokens.Code;
      if (c.lang === "mermaid") {
        const file = diagrams[diagram++];
        if (file) children.push(para([await imageRun(file, CONTENT_PX, 760)], { alignment: AlignmentType.CENTER }));
      } else children.push(...codeDocx(c.text));
    } else if (t.type === "html" && t.raw.includes(SCREENSHOTS_MARK)) {
      children.push(...(await screenshotsDocx(shots)));
    }
  }

  const heading = (size: number, color: string, before: number, after: number) => ({
    run: { font: FONT, size, bold: true, color },
    paragraph: { spacing: { before, after }, keepNext: true, keepLines: true },
  });
  const listLevel = (format: (typeof LevelFormat)[keyof typeof LevelFormat], text: string) => [
    {
      level: 0,
      format,
      text,
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 300 } } },
    },
  ];
  const doc = new Document({
    creator: meta.student ?? "ZEGA",
    title: "ZEGA: MIT 8333 submission",
    styles: {
      default: {
        document: { run: { font: FONT, size: 21 } },
        heading1: heading(36, NAVY, 360, 200),
        heading2: heading(27, NAVY, 300, 120),
        heading3: heading(23, "0F172A", 240, 100),
      },
    },
    numbering: {
      config: [
        { reference: "bullets", levels: listLevel(LevelFormat.BULLET, "•") },
        ...orderedLists.map((reference) => ({ reference, levels: listLevel(LevelFormat.DECIMAL, "%1.") })),
      ],
    },
    sections: [
      {
        properties: {
          page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: ["ZEGA · MIT 8333    ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
                    font: FONT,
                    size: 14,
                    color: "64748B",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  const file = `${OUT_DIR}/${NAME}.docx`;
  writeFileSync(file, await Packer.toBuffer(doc));
  return file;
}

/* --------------------------------------------------------------------- main */

mkdirSync(BUILD, { recursive: true });
const meta = json<Meta>("docs/report/meta.json") ?? {};
const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const md = await assemble();
const shots = await prepareShots();
const diagrams = await buildPdf(md, shots, meta, date);
const docx = await buildDocx(md, shots, diagrams, meta, date);
for (const f of [`${OUT_DIR}/${NAME}.pdf`, docx])
  console.log(`${f} (${(statSync(f).size / 1024 / 1024).toFixed(1)} MB)`);
