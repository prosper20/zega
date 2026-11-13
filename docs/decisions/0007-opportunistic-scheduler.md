# 0007. Cron plus opportunistic maintenance sweep

Date: 2026-11-13 · Status: Accepted

## Context

SLA breaches must be escalated and unconfirmed fixes auto-closed after 72 hours. Vercel's free plan
allows only daily cron jobs, which is too coarse for SLA escalation. A queue service or worker adds
infrastructure.

## Decision

`runMaintenance()` escalates breaches, auto-closes resolutions, and purges expired data. It is
triggered by the daily Vercel Cron (`/api/cron/maintenance`, protected by `CRON_SECRET`) and also,
at most every five minutes, whenever a client holds a live-update connection. A job row in
`system_jobs` is claimed with a conditional `UPDATE … RETURNING`, so only one caller wins each
window. Transitions made by the sweep use the same state machine with the `system` actor.

## Consequences

- Escalation is near real time whenever anyone is using the app, and at least daily otherwise.
- No extra services. The atomic claim makes multiple triggers safe.
- Timing is not guaranteed to the minute when nobody is online; acceptable because the people who
  would act on an escalation are, by definition, not online either.
