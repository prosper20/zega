import { and, desc, eq, lt, sql } from "drizzle-orm";

import * as s from "@/server/db/schema";
import { type Database, rowsOf } from "@/server/db/types";

export async function listAudit(
  db: Database,
  q: { table?: string; rowId?: string; actor?: string; before?: number; limit: number },
) {
  const rows = await db
    .select({
      id: s.auditLogs.id,
      tableName: s.auditLogs.tableName,
      rowId: s.auditLogs.rowId,
      action: s.auditLogs.action,
      actorId: s.auditLogs.actorId,
      actorName: s.users.name,
      diff: s.auditLogs.diff,
      hash: s.auditLogs.hash,
      prevHash: s.auditLogs.prevHash,
      createdAt: s.auditLogs.createdAt,
    })
    .from(s.auditLogs)
    .leftJoin(s.users, eq(s.users.id, s.auditLogs.actorId))
    .where(
      and(
        q.table ? eq(s.auditLogs.tableName, q.table) : undefined,
        q.rowId ? eq(s.auditLogs.rowId, q.rowId) : undefined,
        q.actor ? eq(s.auditLogs.actorId, q.actor) : undefined,
        q.before ? lt(s.auditLogs.id, q.before) : undefined,
      ),
    )
    .orderBy(desc(s.auditLogs.id))
    .limit(q.limit + 1);
  const page = rows.slice(0, q.limit);
  return {
    data: page.map((r) => ({
      ...r,
      actorName: r.actorId === "system" ? "System" : (r.actorName ?? null),
      createdAt: r.createdAt.toISOString(),
    })),
    nextBefore: rows.length > q.limit ? (page.at(-1)?.id ?? null) : null,
  };
}

/** Recomputes the whole hash chain in the database and reports the first broken link, if any. */
export async function verifyAudit(db: Database) {
  const started = Date.now();
  const [r] = rowsOf<{ checked: string; first_broken_id: string | null }>(
    await db.execute(sql`select * from audit_verify_chain()`),
  );
  return {
    intact: r.first_broken_id === null,
    checked: Number(r.checked),
    firstBrokenId: r.first_broken_id === null ? null : Number(r.first_broken_id),
    durationMs: Date.now() - started,
    verifiedAt: new Date().toISOString(),
  };
}
