# ZEGA

**Report it. Track it. Resolve it.**

ZEGA is a university services and maintenance request platform. Students and staff report faults
(a broken socket, a leaking pipe, a dead projector), maintenance officers work them on a board, and
administrators assign, monitor and report on every request. It replaces phone calls, paper forms
and WhatsApp messages, which lose requests and leave no record of who did what.

Live: <https://zega-ms.vercel.app> · API reference: [`/api/docs`](https://zega-ms.vercel.app/api/docs)

## What it does

| Role | Main screens |
| --- | --- |
| Student / staff | Guided report form (category, location or QR scan, photos, duplicate check), my requests, live tracking page with timeline, confirm fix and rate |
| Maintenance officer | Work-order board (drag between Assigned, In progress, On hold, Resolved; Move menu on phones), job page with notes and before/after photos |
| Administrator | Operations dashboard, all requests with filters and bulk actions, smart assignment, users and roles, categories and SLA targets, locations and QR stickers, reports (PDF/CSV), tamper-evident audit trail |

Engineering highlights:

- **One state machine** (`src/domain/request-machine.ts`) decides which status changes each role may
  make. The API enforces it and the UI uses it to show only valid actions.
- **REST API with generated docs.** Hono routes are declared with Zod schemas that both validate
  requests and produce the OpenAPI 3.1 document (Scalar, Swagger UI and a Postman collection).
  Errors follow RFC 9457 Problem Details.
- **Tamper-evident audit trail.** A Postgres trigger records every change with a JSON diff and links
  each row to the previous one with SHA-256. Admins can verify the chain from the UI.
- **Live updates** over Server-Sent Events, driven by Postgres `LISTEN/NOTIFY` triggers.
- **SLA engine** with per category and priority targets, escalation of breaches and auto-close of
  unconfirmed fixes.
- **Mobile first where it matters:** bottom tab bar, cards instead of tables, bottom sheets, 44pt
  touch targets.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui (Radix), TanStack Query, nuqs |
| API | Hono + `@hono/zod-openapi`, mounted at `/api` |
| Auth | Better Auth: database sessions in httpOnly cookies, scrypt hashing, admin plugin, JWT for API clients, rate limiting |
| Database | PostgreSQL on Neon, Drizzle ORM, `ltree`, `pg_trgm`, full-text search, triggers |
| Files and email | Vercel Blob (photos), Resend + React Email |
| Tests | Vitest (unit, PGlite database tests, Testing Library + MSW), Playwright (desktop and mobile) |
| Tooling | TypeScript strict, Biome, Husky + lint-staged, GitHub Actions |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit and
[docs/DATABASE.md](docs/DATABASE.md) for the data model.

## Getting started

Requirements: Node.js 20.9 or later and a PostgreSQL database (a free Neon project works; no Docker
needed).

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, DATABASE_URL_UNPOOLED and BETTER_AUTH_SECRET
npm run db:migrate           # apply migrations
npm run db:seed              # demo data: 48 users, 66 locations, 160 requests
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Postgres URL used by the app |
| `DATABASE_URL_UNPOOLED` | Recommended | Direct URL for migrations and `LISTEN/NOTIFY` (live updates) |
| `BETTER_AUTH_SECRET` | Yes | 32+ character secret: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical site URL for links, Open Graph and auth origin checks |
| `RESEND_API_KEY`, `EMAIL_FROM` | No | Email notifications (logged instead when unset) |
| `BLOB_READ_WRITE_TOKEN` | No | Photo storage on Vercel Blob (local `public/uploads` when unset) |
| `CRON_SECRET` | No | Protects `/api/cron/maintenance` (Vercel Cron sends it) |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, `error` or `silent` |

### Demo accounts

All demo accounts use the password `Zega@2026!`. The login page also has one-click demo buttons.

| Role | Email |
| --- | --- |
| Administrator | `admin@zega.test` |
| Maintenance officer | `officer@zega.test` |
| Staff | `staff@zega.test` |
| Student | `student@zega.test` |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run check` / `npm run check:fix` | Biome lint and format check (and fix) |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit, database (PGlite) and component tests |
| `npm run test:coverage` | Same, with coverage thresholds |
| `npm run test:e2e` | Playwright end-to-end tests (desktop and mobile) |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo data (refuses if already seeded) |
| `npm run db:reset -- --yes` | Drop everything (destructive) |
| `npm run docs:api` | Export `docs/api/openapi.json` and the Postman collection |
| `npm run test:report` | Collect test results and coverage into `docs/testing` |

## Testing

- **Unit:** state machine (every transition for every role), SLA maths, permissions, schemas.
- **API and database:** every route runs in-process against a real Postgres (PGlite) with the real
  migrations, triggers and seed: auth, RBAC denials, validation, CRUD, assignment, transitions,
  exports, live events and the audit hash chain.
- **Components:** forms, tables, the work board and the audit viewer with Testing Library and MSW.
- **End to end:** the full lifecycle across roles (report, assign, work on the board, confirm),
  admin tools and mobile navigation.

CI runs lint, types, tests with coverage and a production build on every push, then Playwright.

## Deployment

Vercel (app and API) with Neon (database). Migrations run before each build, and a daily cron runs
the SLA sweep. Step-by-step guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
`/api/health` reports database connectivity and latency.

## Project layout

```
src/
  app/                 routes (marketing, auth, dashboard per role, api, print)
    (main)/dashboard/<screen>/_components/   screen-specific components live next to their route
  components/          shared components (ui/ holds the shadcn primitives)
  domain/              pure business rules: state machine, SLA, permissions
  server/
    api/               Hono app, routes, schemas, Problem Details
    services/          business logic used by the API and server components
    db/                Drizzle schema, migrations runner, seed
    realtime/          event bus (Postgres LISTEN/NOTIFY) and SSE fan-out
drizzle/               SQL migrations (extensions, schema, triggers)
tests/                 API, database and end-to-end tests
docs/                  architecture, database, deployment, API exports
```

## Licence

MIT. The dashboard shell is based on Studio Admin (MIT).
