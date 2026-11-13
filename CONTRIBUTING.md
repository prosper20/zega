# Contributing

Thanks for helping improve ZEGA. This guide covers how to set up, the conventions the codebase
follows, and what a change needs before it is merged.

## Setup

Follow [Getting started](README.md#getting-started). Use npm. The Husky pre-commit hook runs Biome on
staged files and rejects em dashes.

## Where code goes

- Screens: `src/app/(main)/dashboard/<screen>/page.tsx`, with their components, data and schemas in
  `_components/` next to the route. Move something to `src/components` only when a second feature
  uses it.
- Business rules with no I/O: `src/domain`. Database work: `src/server/services`. HTTP concerns:
  `src/server/api`.
- Keep `page.tsx` a Server Component; put interactivity in a Client Component.
- Do not edit `src/components/ui/` except for project-wide design rules (see `AGENTS.md`).

## Conventions

- TypeScript strict, no `any` in application code.
- Biome formatting: double quotes, semicolons, two-space indent, sorted imports, 120 columns.
  Run `npm run check:fix`.
- Use semantic theme tokens (`bg-primary`, `text-muted-foreground`), never raw colour values.
  Focus and selection are shown by border colour only.
- Copy is British English, plain and specific. No em dashes, no exclamation marks in UI messages,
  no filler such as "seamless" or "powerful". Name buttons after their action ("Deactivate", not
  "OK").
- Phones: tables need a card layout, touch targets at least 44px, dialogs work as bottom sheets.
- Ask for confirmation before destructive or hard-to-reverse actions.
- New API routes are declared with `createRoute` and Zod schemas so they appear in the OpenAPI docs;
  errors are thrown with `problems.*` so they become Problem Details.
- Server logs go through `log` from `src/server/log.ts` with a dotted event name. Never log secrets
  or request bodies.

## Tests

- Domain rules: unit tests next to the code.
- API behaviour: add a case to `tests/api` (runs against PGlite with real migrations).
- Interactive components: Testing Library + MSW, next to the component.
- User journeys: Playwright in `tests/e2e`, desktop and mobile projects.

Before opening a pull request:

```bash
npm run check && npm run typecheck && npm test
```

Run `npm run test:e2e` for changes to flows or layout.

## Database changes

Edit the schema in `src/server/db/schema`, run `npm run db:generate`, review the generated SQL, and
commit it with the change. Triggers and functions go in hand-written SQL migrations. Migrations are
forward-only.

## Commits and pull requests

- Short commit messages in the imperative or as a summary: `fix audit chain race`,
  `add privacy page`. Conventional prefixes (`feat:`, `fix:`, `docs:`) are welcome.
- One concern per pull request. Describe what changed and why.
- Include screenshots for visual changes, with mobile and dark theme where relevant.
- Explain any new dependency or reusable pattern, and record significant decisions as an ADR in
  `docs/decisions`.
