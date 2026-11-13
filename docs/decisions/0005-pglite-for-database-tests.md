# 0005. PGlite for API and database tests

Date: 2026-11-13 · Status: Accepted

## Context

Most of ZEGA's important behaviour lives in Postgres: triggers, `ltree`, trigram search, the audit
chain, `NOTIFY`. Mocking the database would test none of it. A Docker Postgres per test run is slow
and needs Docker in CI and on every laptop.

## Decision

Run API and database tests against PGlite, Postgres compiled to WebAssembly, in process. Each suite
applies the real migrations and seed, then calls the real Hono app with `app.request()`. Only the
edges are swapped: a header-based authenticator, in-memory file storage and an in-process event bus
fed by PGlite's own `LISTEN`.

## Consequences

- Tests exercise real SQL, triggers and extensions with no external services, in seconds.
- CI needs nothing beyond Node.
- PGlite lags upstream Postgres slightly and runs single-connection, so true concurrency (like the
  audit race in ADR 0004) is reasoned about and verified against Neon rather than in unit tests.
