# Architecture decision records

Short records of decisions that shaped ZEGA: the context, what was chosen, and what it costs.
Format: [Michael Nygard's ADR template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-hono-openapi-api.md) | REST API with Hono and Zod-generated OpenAPI | Accepted |
| [0002](0002-better-auth.md) | Better Auth for sessions, roles and JWT | Accepted |
| [0003](0003-sse-over-postgres-listen.md) | Live updates with SSE over Postgres LISTEN/NOTIFY | Accepted |
| [0004](0004-hash-chained-audit-trail.md) | Hash-chained audit trail in the database | Accepted |
| [0005](0005-pglite-for-database-tests.md) | PGlite for API and database tests | Accepted |
| [0006](0006-vercel-and-single-neon-database.md) | Vercel with one shared Neon database | Accepted |
| [0007](0007-opportunistic-scheduler.md) | Cron plus opportunistic maintenance sweep | Accepted |
| [0008](0008-studio-admin-base.md) | Studio Admin as the UI base | Accepted |
