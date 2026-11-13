# ZEGA

**Report it. Track it. Resolve it.**

ZEGA (inspired by *Zegaba*, "report") is a university services and maintenance request platform. Students and staff report faults, maintenance officers resolve them, and administrators assign, monitor and report on every request.

Built for MIT 8333, Advanced Web Application Development.

## Stack

Next.js 16 · React 19 · Tailwind v4 · shadcn/ui · Hono + OpenAPI · Drizzle + PostgreSQL (Neon) · Better Auth · Vitest · Playwright

## Development

```bash
npm install
cp .env.example .env.local   # fill in your Neon URLs and a BETTER_AUTH_SECRET
npm run db:migrate           # apply migrations (Neon over WebSockets, port 443)
npm run db:seed              # demo data: 48 users, 66 locations, 160 requests
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo data (refuses if already seeded) |
| `npm run db:reset -- --yes` | Drop everything (destructive) |
| `npm test` | Unit, database (PGlite) and component tests |
| `npm run test:e2e` | Playwright end-to-end tests |

### Optional services

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email notifications via Resend (logged to the console when unset) |
| `BLOB_READ_WRITE_TOKEN` | Photo storage on Vercel Blob (local `public/uploads` when unset) |
| `CRON_SECRET` | Protects `/api/cron/maintenance` (Vercel Cron sends it automatically) |

Live updates use Server-Sent Events backed by Postgres `LISTEN/NOTIFY`. The SLA escalation and
auto-close sweep runs from the daily Vercel Cron and, opportunistically, at most every 5 minutes
whenever someone is connected to live updates.

### Demo accounts

All demo accounts use the password `Zega@2026!`.

| Role | Email |
| --- | --- |
| Administrator | `admin@zega.test` |
| Maintenance officer | `officer@zega.test` |
| Staff | `staff@zega.test` |
| Student | `student@zega.test` |

## Credits

The UI shell is based on [Studio Admin](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) (MIT). See `NOTICE`.
