# 0004. Hash-chained audit trail in the database

Date: 2026-11-12 · Status: Accepted (amended 2026-11-13)

## Context

The problem statement names "no accountability" as a core failure of the manual process. An audit
log written by application code misses changes made elsewhere (scripts, the seed, future code) and
can be edited by anyone with database access.

## Decision

A generic Postgres trigger records every insert, update and delete on business tables with a JSON
diff and the actor, taken from the transaction setting `app.user_id` that `withActor()` sets. Each
row stores `sha256(prev_hash | digest(row))`. Triggers forbid updating, deleting or truncating
`audit_logs`. `audit_verify_chain()` recomputes the chain; admins run it from the UI.

**Amendment (migration 0004).** Concurrent writers could take sequence ids in one order and the
chain lock in the other, so verification by id order reported a break. The id is now assigned inside
the trigger while holding the advisory lock, making id order equal chain order.

## Consequences

- Coverage is complete by construction: no code path can skip auditing.
- Tampering is detectable: changing any past row breaks every later hash.
- Writes to audited tables serialise on one advisory lock. That is fine at university scale; at
  much higher write rates the chain would be partitioned per table or batched.
