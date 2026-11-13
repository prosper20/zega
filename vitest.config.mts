import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    env: { SKIP_ENV_VALIDATION: "1" },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "tests/api/**/*.test.ts"],
          // Building a PGlite database from the migrations can exceed 10s under full coverage load.
          hookTimeout: 60_000,
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup-dom.ts"],
          // jsdom renders are slow under coverage instrumentation; the 5s default flakes on busy machines.
          testTimeout: 15_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      // ZEGA's own logic. Next.js pages/layouts are exercised by the Playwright suite; vendored
      // Studio Admin primitives, reference templates and the preferences system are out of scope.
      include: [
        "src/domain/**",
        "src/server/**",
        "src/lib/**",
        "src/components/requests/**",
        "src/components/live/**",
        "src/app/**/_components/**",
      ],
      exclude: [
        "src/**/*.test.*",
        "src/test/**",
        // Folder names like "(main)" contain glob metacharacters, so match by name instead.
        "**/_templates/**",
        "**/ui-mocks.tsx",
        "src/lib/fonts/**",
        "src/lib/preferences/**",
        "src/lib/{highlighter,local-storage.client,cookie.client,data-table-features,app-icon}.{ts,tsx}",
        "src/server/{server-actions,auth,session}.ts",
        "src/server/db/index.ts",
        "src/server/realtime/neon-bus.ts",
        "src/server/api/authenticate.ts",
        "**/dashboard/_components/sidebar/**",
        "**/dashboard/_components/header/**",
        // Server components that query the database directly; covered by the Playwright suite.
        "**/_components/home/requester-home.tsx",
        "**/_components/home/officer-home.tsx",
      ],
      reporter: ["text-summary", "html", "json-summary"],
      // CI fails if coverage drops below these floors.
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 50,
        branches: 45,
        "src/domain/**": { lines: 95, branches: 90 },
        "src/server/api/**": { lines: 80 },
        "src/server/services/**": { lines: 80 },
      },
      reportsDirectory: "coverage",
    },
  },
});
