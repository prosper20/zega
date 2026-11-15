// Writes test results and coverage to docs/testing. Usage: npm run test:report [-- --e2e]
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const out = "docs/testing";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const run = (cmd: string, env: Record<string, string> = {}) => {
  console.log(`$ ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
    return true;
  } catch {
    return false;
  }
};

const unitOk = run(
  `npx vitest run --coverage --reporter=default --reporter=junit --outputFile.junit=${out}/vitest-junit.xml --reporter=json --outputFile.json=${out}/vitest-results.json`,
  {
    SKIP_ENV_VALIDATION: "1",
  },
);
if (existsSync("coverage/coverage-summary.json"))
  cpSync("coverage/coverage-summary.json", `${out}/coverage-summary.json`);

let e2eOk: boolean | null = null;
if (process.argv.includes("--e2e")) {
  e2eOk = run("npx playwright test --reporter=html,json", {
    PLAYWRIGHT_JSON_OUTPUT_NAME: `${out}/playwright-results.json`,
  });
  if (existsSync("playwright-report")) cpSync("playwright-report", `${out}/playwright-report`, { recursive: true });
}

const vitest = existsSync(`${out}/vitest-results.json`)
  ? JSON.parse(readFileSync(`${out}/vitest-results.json`, "utf8"))
  : null;
const coverage = existsSync(`${out}/coverage-summary.json`)
  ? JSON.parse(readFileSync(`${out}/coverage-summary.json`, "utf8")).total
  : null;
const summary = {
  generatedAt: new Date().toISOString(),
  vitest: vitest && {
    files: vitest.numTotalTestSuites,
    tests: vitest.numTotalTests,
    passed: vitest.numPassedTests,
    failed: vitest.numFailedTests,
  },
  coverage: coverage && Object.fromEntries(Object.entries(coverage).map(([k, v]) => [k, (v as { pct: number }).pct])),
  e2e: e2eOk,
};
writeFileSync(`${out}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(summary);
process.exit(unitOk && e2eOk !== false ? 0 : 1);
