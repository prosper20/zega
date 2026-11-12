import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import * as s from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";

export async function listNotifications(
  db: Database,
  user: CurrentUser,
  q: { unread?: boolean; before?: string; limit: number },
) {
  const where = and(
    eq(s.notifications.userId, user.id),
    q.unread ? isNull(s.notifications.readAt) : undefined,
    q.before ? lt(s.notifications.createdAt, new Date(q.before)) : undefined,
  );
  const [rows, [{ unread }]] = await Promise.all([
    db
      .select({
        id: s.notifications.id,
        type: s.notifications.type,
        title: s.notifications.title,
        body: s.notifications.body,
        requestId: s.notifications.requestId,
        refCode: s.serviceRequests.refCode,
        readAt: s.notifications.readAt,
        createdAt: s.notifications.createdAt,
      })
      .from(s.notifications)
      .leftJoin(s.serviceRequests, eq(s.serviceRequests.id, s.notifications.requestId))
      .where(where)
      .orderBy(desc(s.notifications.createdAt))
      .limit(q.limit),
    db
      .select({ unread: sql<number>`count(*)::int` })
      .from(s.notifications)
      .where(and(eq(s.notifications.userId, user.id), isNull(s.notifications.readAt))),
  ]);
  return {
    data: rows.map((n) => ({ ...n, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() })),
    unread: Number(unread),
  };
}

export async function markRead(db: Database, user: CurrentUser, ids: string[] | "all") {
  await db
    .update(s.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(s.notifications.userId, user.id),
        isNull(s.notifications.readAt),
        ids === "all" ? undefined : inArray(s.notifications.id, ids),
      ),
    );
  const [{ unread }] = await db
    .select({ unread: sql<number>`count(*)::int` })
    .from(s.notifications)
    .where(and(eq(s.notifications.userId, user.id), isNull(s.notifications.readAt)));
  return { unread: Number(unread) };
}
