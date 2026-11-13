# Changelog

All notable changes to ZEGA. Dates are when the work landed.

## 1.0.0, 2026-11-13

### Quality pass
- Open Graph and Twitter images, canonical URLs, title template, sitemap and robots rules,
  JSON-LD on the landing page; private pages marked `noindex`.
- Visual pass: focus and selection shown by border colour only, no gradients or glows, one radius
  and elevation scale.
- Role-grouped abstract avatars generated from the user id.
- Mobile mode: bottom tab bar, cards instead of tables, filters and dialogs as bottom sheets,
  segmented work board with a Move menu, sticky report actions, 44pt touch targets.
- Confirmation before deactivating users, changing roles, archiving categories and bulk actions.
- Request services split into queries, lifecycle, collaboration and matching modules.
- Structured JSON logging with security events, Content Security Policy, data retention purge and a
  privacy notice.
- Documentation: architecture, database, decision records, contributing guide.
- Removed template leftovers and unused dependencies.

### Deployment
- Vercel configuration (region, migrations before build, daily cron) and deployment guide.
- `/api/health` with database latency.

### Testing
- Vitest unit, PGlite database and component tests with coverage thresholds; Playwright
  end-to-end on desktop and mobile; CI on every push.

### Live updates and notifications
- Server-Sent Events backed by Postgres `LISTEN/NOTIFY`; notification bell and page.
- Email via Resend after commit, with per-user preference.
- SLA escalation and auto-close of unconfirmed fixes.
- Fixed a race that could break the audit hash chain under concurrent writes.

### Administrator console
- Operations dashboard, all requests with filters, bulk assign and priority, smart officer
  suggestions.
- Users and roles, categories and SLA targets, locations with printable QR stickers.
- Reports with PDF and CSV export; audit trail viewer with integrity check.

### Officer experience
- Work-order board with drag and drop between statuses; installable PWA.

### Requester experience
- Guided report form with QR prefill, photo upload, duplicate detection and "me too".
- Tracking page with status stepper, SLA countdown and timeline; confirm or reopen and rate.

### Foundation
- REST API with Hono and generated OpenAPI docs (Scalar, Swagger UI, Postman).
- Better Auth: sessions, roles, JWT, rate limiting; role-based access in API and UI.
- Database schema, migrations, triggers (audit chain, location paths, events) and demo seed.
- Landing page and ZEGA wordmark.
