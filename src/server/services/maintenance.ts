import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import { OPEN_STATUSES } from "@/domain/constants";
import { checkTransition } from "@/domain/request-machine";
import { SYSTEM_ACTOR, withActor } from "@/server/db/actor";
import * as s from "@/server/db/schema";
import { type Database, rowsOf } from "@/server/db/types";

import { adminIds, notify } from "./notify";

export const AUTO_CLOSE_HOURS = 72;

/**
 * Atomically claims a job for this run window. Only one server instance wins, so the sweep can be
 * triggered from many places (Vercel Cron, live connections) without double-running.
 */
export async function claimJob(db: Database, name: string, everySeconds: number) {
  await db
    .insert(s.systemJobs)
    .values({ name, lastRunAt: new Date(0) })
    .onConflictDoNothing();
  const won = rowsOf<{ name: string }>(
    await db.execute(sql`
      update system_jobs set last_run_at = now()
      where name = ${name} and last_run_at < now() - make_interval(secs => ${everySeconds})
      returning name`),
  );
  return won.length > 0;
}

/** Escalates open requests past their resolution target once: the officer hears about their job, admins get a digest. */
export async function escalateSlaBreaches(db: Database, now = new Date()) {
  const breached = await db
    .select({
      id: s.serviceRequests.id,
      refCode: s.serviceRequests.refCode,
      title: s.serviceRequests.title,
      assigneeId: s.serviceRequests.currentAssigneeId,
    })
    .from(s.serviceRequests)
    .where(
      and(
        isNull(s.serviceRequests.deletedAt),
        isNull(s.serviceRequests.slaEscalatedAt),
        inArray(s.serviceRequests.status, [...OPEN_STATUSES]),
        lt(s.serviceRequests.resolutionDueAt, now),
      ),
    )
    .limit(100);
  if (!breached.length) return 0;

  await withActor(db, SYSTEM_ACTOR, async (tx) => {
    await tx
      .update(s.serviceRequests)
      .set({ slaEscalatedAt: now })
      .where(
        inArray(
          s.serviceRequests.id,
          breached.map((b) => b.id),
        ),
      );
    for (const b of breached) {
      if (!b.assigneeId) continue;
      await notify(tx, {
        userIds: [b.assigneeId],
        type: "sla.breach",
        title: `${b.refCode} is past its resolution target`,
        body: "Please prioritise this job, or put it on hold with a reason.",
        requestId: b.id,
        data: { refCode: b.refCode, requestTitle: b.title },
      });
    }
    const list = breached
      .slice(0, 5)
      .map((b) => b.refCode)
      .join(", ");
    await notify(tx, {
      userIds: await adminIds(tx),
      type: "sla.breach",
      title:
        breached.length === 1
          ? `${breached[0].refCode} breached its SLA`
          : `${breached.length} requests breached their SLA`,
      body: `Past the resolution target: ${list}${breached.length > 5 ? ` and ${breached.length - 5} more` : ""}.`,
      requestId: breached.length === 1 ? breached[0].id : undefined,
      data:
        breached.length === 1
          ? { refCode: breached[0].refCode, requestTitle: breached[0].title }
          : { count: breached.length },
    });
  });
  return breached.length;
}

/** Closes resolved requests the requester has not confirmed within AUTO_CLOSE_HOURS. */
export async function autoCloseResolved(db: Database, now = new Date()) {
  const cutoff = new Date(now.getTime() - AUTO_CLOSE_HOURS * 3_600_000);
  const stale = await db
    .select({
      id: s.serviceRequests.id,
      refCode: s.serviceRequests.refCode,
      title: s.serviceRequests.title,
      requesterId: s.serviceRequests.requesterId,
      assigneeId: s.serviceRequests.currentAssigneeId,
    })
    .from(s.serviceRequests)
    .where(
      and(
        eq(s.serviceRequests.status, "resolved"),
        lt(s.serviceRequests.resolvedAt, cutoff),
        isNull(s.serviceRequests.deletedAt),
      ),
    )
    .limit(100);
  if (!stale.length) return 0;
  const allowed = checkTransition(
    { status: "resolved", userId: null, role: "system", requesterId: "", assigneeId: null },
    "closed",
  );
  if (!allowed.ok) throw new Error("state machine forbids system auto-close");

  await withActor(db, SYSTEM_ACTOR, async (tx) => {
    for (const r of stale) {
      await tx.update(s.serviceRequests).set({ status: "closed", closedAt: now }).where(eq(s.serviceRequests.id, r.id));
      await tx.insert(s.statusLogs).values({
        requestId: r.id,
        fromStatus: "resolved",
        toStatus: "closed",
        actorId: null,
        note: `Closed automatically: not confirmed within ${AUTO_CLOSE_HOURS} hours of being resolved.`,
        createdAt: now,
      });
      await notify(tx, {
        userIds: [r.requesterId],
        type: "request.auto_closed",
        title: `${r.refCode} was closed automatically`,
        body: `It was marked resolved over ${AUTO_CLOSE_HOURS} hours ago without confirmation. If the problem is back, report it again.`,
        requestId: r.id,
        data: { refCode: r.refCode, requestTitle: r.title },
      });
    }
  });
  return stale.length;
}

/** The background sweep. Safe to call often: it runs at most once per window across all instances. */
export async function runMaintenance(db: Database, opts: { force?: boolean; everySeconds?: number } = {}) {
  const claimed = await claimJob(db, "maintenance", opts.force ? 0 : (opts.everySeconds ?? 300));
  if (!claimed) return { ran: false as const };
  const escalated = await escalateSlaBreaches(db);
  const autoClosed = await autoCloseResolved(db);
  const result = { ran: true as const, escalated, autoClosed, at: new Date().toISOString() };
  await db
    .update(s.systemJobs)
    .set({ lastResult: JSON.stringify(result) })
    .where(eq(s.systemJobs.name, "maintenance"));
  return result;
}
