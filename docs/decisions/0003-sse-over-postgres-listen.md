# 0003. Live updates with SSE over Postgres LISTEN/NOTIFY

Date: 2026-11-13 · Status: Accepted

## Context

Requesters should see status changes and officers new assignments without reloading. Socket.io needs
a long-running server, which Vercel functions are not. Pusher or Ably add a paid third party and a
second source of truth.

## Decision

Database triggers on `status_logs` and `notifications` call `pg_notify('zega_events', payload)`.
`/api/events` is a Server-Sent Events stream. Each server instance keeps one `LISTEN` connection on
Neon's direct (unpooled) URL and fans events out to connected users after a visibility check. The
browser's `EventSource` reconnects automatically, and after a reconnect the client refetches its
cached queries, so nothing missed while offline stays stale. Events invalidate TanStack Query caches
rather than patching state, so the database stays the source of truth.

## Consequences

- Events are emitted by the database, so every write path (API, cron, seed) produces them and they
  only fire after commit.
- No extra infrastructure or vendor.
- SSE is one-way, which is all ZEGA needs; writes stay ordinary REST calls.
- Serverless functions have a maximum duration, so streams end and reconnect periodically. The
  reconnect is invisible to users.
