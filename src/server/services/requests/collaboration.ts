/** People working together on a request: comments, "me too" votes and the merged timeline. */
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { OPEN_STATUSES } from "@/domain/constants";
import { can } from "@/domain/permissions";
import { problems } from "@/server/api/problem";
import { withActor } from "@/server/db/actor";
import * as s from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";

import { notify } from "../notify";
import { loadVisible, UUID_PATTERN } from "./shared";

export async function listComments(db: Database, user: CurrentUser, idOrRef: string) {
  const row = await loadVisible(db, user, idOrRef);
  const showInternal = can(user.role, "comment:internal");
  const rows = await db
    .select({
      id: s.comments.id,
      body: s.comments.body,
      internal: s.comments.internal,
      createdAt: s.comments.createdAt,
      authorId: s.users.id,
      authorName: s.users.name,
      authorRole: s.users.role,
    })
    .from(s.comments)
    .innerJoin(s.users, eq(s.users.id, s.comments.authorId))
    .where(and(eq(s.comments.requestId, row.id), showInternal ? undefined : eq(s.comments.internal, false)))
    .orderBy(asc(s.comments.createdAt));
  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    internal: c.internal,
    author: { id: c.authorId, name: c.authorName, role: c.authorRole as CurrentUser["role"] },
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function addComment(
  db: Database,
  user: CurrentUser,
  idOrRef: string,
  input: { body: string; internal: boolean },
) {
  const row = await loadVisible(db, user, idOrRef);
  if (input.internal && !can(user.role, "comment:internal"))
    throw problems.forbidden("Only officers and admins can write internal notes.");
  const [c] = await withActor(db, user.id, async (tx) => {
    const inserted = await tx
      .insert(s.comments)
      .values({ requestId: row.id, authorId: user.id, body: input.body, internal: input.internal })
      .returning();
    await notify(tx, {
      userIds: input.internal ? [row.currentAssigneeId] : [row.requesterId, row.currentAssigneeId],
      type: "request.comment",
      title: `New ${input.internal ? "internal note" : "comment"} on ${row.refCode}`,
      body: input.body.slice(0, 140),
      requestId: row.id,
      data: { refCode: row.refCode, requestTitle: row.title },
      exclude: user.id,
    });
    return inserted;
  });
  return {
    id: c.id,
    body: c.body,
    internal: c.internal,
    author: { id: user.id, name: user.name, role: user.role },
    createdAt: c.createdAt.toISOString(),
  };
}

/** "Me too" can be added to any open request (not only ones you can already see), found via /requests/similar. */
async function loadForVote(db: Database, idOrRef: string) {
  const key = UUID_PATTERN.test(idOrRef)
    ? eq(s.serviceRequests.id, idOrRef)
    : eq(s.serviceRequests.refCode, idOrRef.toUpperCase());
  const [row] = await db
    .select({ id: s.serviceRequests.id, requesterId: s.serviceRequests.requesterId, status: s.serviceRequests.status })
    .from(s.serviceRequests)
    .where(and(key, isNull(s.serviceRequests.deletedAt)));
  if (!row) throw problems.notFound("Request");
  return row;
}

export async function setVote(db: Database, user: CurrentUser, idOrRef: string, on: boolean) {
  if (!can(user.role, "request:vote")) throw problems.forbidden("Only students and staff can add a “me too”.");
  const row = await loadForVote(db, idOrRef);
  if (row.requesterId === user.id) throw problems.conflict("You reported this request.", "own-request");
  if (on && !OPEN_STATUSES.includes(row.status)) throw problems.conflict("This request is no longer open.", "not-open");
  if (on) await db.insert(s.requestVotes).values({ requestId: row.id, userId: user.id }).onConflictDoNothing();
  else
    await db
      .delete(s.requestVotes)
      .where(and(eq(s.requestVotes.requestId, row.id), eq(s.requestVotes.userId, user.id)));
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.requestVotes)
    .where(eq(s.requestVotes.requestId, row.id));
  return { voteCount: Number(n), hasVoted: on };
}

export async function getTimeline(db: Database, user: CurrentUser, idOrRef: string) {
  const row = await loadVisible(db, user, idOrRef);
  const showInternal = can(user.role, "comment:internal");
  const actor = alias(s.users, "actor");
  const officer = alias(s.users, "officer");
  const [logs, assigns, comments, files] = await Promise.all([
    db
      .select({
        at: s.statusLogs.createdAt,
        from: s.statusLogs.fromStatus,
        to: s.statusLogs.toStatus,
        note: s.statusLogs.note,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
      })
      .from(s.statusLogs)
      .leftJoin(actor, eq(actor.id, s.statusLogs.actorId))
      .where(eq(s.statusLogs.requestId, row.id)),
    db
      .select({
        at: s.assignments.assignedAt,
        note: s.assignments.note,
        officerId: officer.id,
        officerName: officer.name,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
      })
      .from(s.assignments)
      .innerJoin(officer, eq(officer.id, s.assignments.officerId))
      .leftJoin(actor, eq(actor.id, s.assignments.assignedById))
      .where(eq(s.assignments.requestId, row.id)),
    listComments(db, user, row.id),
    db
      .select({
        at: s.attachments.createdAt,
        url: s.attachments.url,
        kind: s.attachments.kind,
        contentType: s.attachments.contentType,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
      })
      .from(s.attachments)
      .innerJoin(actor, eq(actor.id, s.attachments.uploadedById))
      .where(eq(s.attachments.requestId, row.id)),
  ]);
  const ref = (id: string | null, name: string | null, role: string | null) =>
    id ? { id, name: name ?? "Unknown", role: (role ?? undefined) as CurrentUser["role"] | undefined } : null;
  type Item = { at: string } & Record<string, unknown>;
  const items: Item[] = [
    ...logs.map((l) => ({
      kind: "status",
      at: l.at.toISOString(),
      actor: ref(l.actorId, l.actorName, l.actorRole),
      from: l.from,
      to: l.to,
      note: l.note,
    })),
    ...assigns.map((a) => ({
      kind: "assignment",
      at: a.at.toISOString(),
      actor: ref(a.actorId, a.actorName, a.actorRole),
      officer: { id: a.officerId, name: a.officerName, role: "officer" },
      note: a.note,
    })),
    ...comments
      .filter((c) => showInternal || !c.internal)
      .map((c) => ({ kind: "comment", at: c.createdAt, actor: c.author, body: c.body, internal: c.internal })),
    ...files.map((f) => ({
      kind: "attachment",
      at: f.at.toISOString(),
      actor: ref(f.actorId, f.actorName, f.actorRole),
      url: f.url,
      attachmentKind: f.kind,
      contentType: f.contentType,
    })),
  ];
  // Stable order: by time, and status changes before other events at the same instant.
  const rank: Record<string, number> = { status: 0, assignment: 1, attachment: 2, comment: 3 };
  return items.sort((a, b) => a.at.localeCompare(b.at) || rank[a.kind as string] - rank[b.kind as string]);
}

/* ---------------------------------------------------------------- similar + suggestions */
