import { eq, inArray } from "drizzle-orm";

import * as s from "@/server/db/schema";
import type { DbOrTx } from "@/server/db/types";

export type NotificationInput = {
  userIds: (string | null | undefined)[];
  type: string;
  title: string;
  body: string;
  requestId?: string;
  data?: Record<string, unknown>;
  /** The user who caused the event never notifies themselves. */
  exclude?: string | null;
};

/**
 * Writes in-app notifications. An insert trigger NOTIFYs the realtime channel; email delivery
 * hooks in here too (Phase 7).
 */
export async function notify(tx: DbOrTx, n: NotificationInput) {
  const recipients = [...new Set(n.userIds.filter((u): u is string => Boolean(u) && u !== n.exclude))];
  if (!recipients.length) return;
  await tx.insert(s.notifications).values(
    recipients.map((userId) => ({
      userId,
      type: n.type,
      title: n.title,
      body: n.body,
      requestId: n.requestId,
      data: n.data,
    })),
  );
}

export async function adminIds(tx: DbOrTx) {
  const rows = await tx.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, "admin"));
  return rows.map((r) => r.id);
}

export async function activeUserIds(tx: DbOrTx, ids: string[]) {
  if (!ids.length) return [];
  const rows = await tx
    .select({ id: s.users.id, banned: s.users.banned })
    .from(s.users)
    .where(inArray(s.users.id, ids));
  return rows.filter((r) => !r.banned).map((r) => r.id);
}
