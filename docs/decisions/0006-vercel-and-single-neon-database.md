# 0006. Vercel with one shared Neon database

Date: 2026-11-13 · Status: Accepted

## Context

The app must be deployed with a working database on free tiers. Neon supports branches (a separate
database per environment or per preview deployment). The project has one developer, demo data and
no real users.

## Decision

Deploy the app and API to Vercel (region `iad1`, next to Neon's `us-east-2`). Use **one** Neon
database for local development and production. Migrations run before every build
(`npm run db:migrate && npm run build`). Automated tests never use it (ADR 0005); end-to-end runs
create clearly prefixed "E2E" records, and the database is reseeded before final screenshots.

## Consequences

- One set of credentials, no drift between environments, nothing to synchronise.
- Local experiments and e2e runs write to the same data the live demo shows. Accepted for a course
  project with seeded data; a destructive local command (`db:reset`) affects production, so it
  requires an explicit `--yes`.
- For real use the next step is a Neon production branch with its own URL in Vercel, and preview
  branches per pull request.
