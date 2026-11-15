import { createElement } from "react";

import { eq, inArray } from "drizzle-orm";

import { appUrl } from "@/config/app-url";
import { afterCommit } from "@/server/db/actor";
import * as s from "@/server/db/schema";
import type { DbOrTx } from "@/server/db/types";
import { sendEmail } from "@/server/email";
import { NotificationEmail } from "@/server/email/templates";

export type NotificationInput = {
  userIds: (string | null | undefined)[];
  type: string;
  title: string;
  body: string;
  requestId?: string;
  data?: Record<string, unknown> & { refCode?: string; requestTitle?: string };
  /** The user who caused the event never notifies themselves. */
  exclude?: string | null;
};

/** Events important enough to also email (everything else is in-app only). */
const EMAIL_TYPES = new Set([
  "request.assigned",
  "request.resolved",
  "request.reopened",
  "request.rejected",
  "sla.breach",
  "request.auto_closed",
]);

const CTA: Record<string, string> = {
  "request.assigned": "Open the job",
  "request.resolved": "Confirm the fix",
  "sla.breach": "Review the request",
};

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

  if (!EMAIL_TYPES.has(n.type)) return;
  const people = await tx
    .select({
      id: s.users.id,
      email: s.users.email,
      name: s.users.name,
      optIn: s.users.emailNotifications,
      banned: s.users.banned,
    })
    .from(s.users)
    .where(inArray(s.users.id, recipients));
  const base = appUrl();
  const link = n.data?.refCode ? `${base}/dashboard/requests/${n.data.refCode}` : `${base}/dashboard/notifications`;
  for (const p of people.filter((x) => x.optIn && !x.banned)) {
    afterCommit(() =>
      sendEmail({
        to: p.email,
        subject: `[ZEGA] ${n.title}`,
        react: createElement(NotificationEmail, {
          heading: n.title,
          body: n.body,
          refCode: n.data?.refCode,
          title: n.data?.requestTitle,
          ctaLabel: CTA[n.type] ?? "View request",
          ctaUrl: link,
          recipientName: p.name,
        }),
      }),
    );
  }
}

export async function adminIds(tx: DbOrTx) {
  const rows = await tx.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, "admin"));
  return rows.map((r) => r.id);
}
