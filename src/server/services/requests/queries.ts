/** Reading requests: filtered, keyset-paginated lists and the full detail view. */
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, type SQL, sql } from "drizzle-orm";

import { OPEN_STATUSES } from "@/domain/constants";
import { can } from "@/domain/permissions";
import { availableTransitions } from "@/domain/request-machine";
import { problems } from "@/server/api/problem";
import type { RequestListInput } from "@/server/api/schemas/requests";
import * as s from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";

import { listAttachments } from "../attachments";
import {
  iso,
  loadVisible,
  REF_PATTERN,
  type Row,
  selectRequests,
  toSummary,
  transitionContext,
  visibilityCondition,
} from "./shared";

type SortKey = RequestListInput["sort"];
type Cursor = { v: string | null; id: string };

const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString("base64url");
function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (typeof c?.id !== "string") throw new Error();
    return c;
  } catch {
    throw problems.badRequest("Invalid cursor.");
  }
}

const SORTS: Record<SortKey, { expr: SQL; dir: "asc" | "desc"; cast: string; value: (r: Row) => string | null }> = {
  newest: {
    expr: sql`${s.serviceRequests.createdAt}`,
    dir: "desc",
    cast: "timestamptz",
    value: (r) => r.createdAt.toISOString(),
  },
  oldest: {
    expr: sql`${s.serviceRequests.createdAt}`,
    dir: "asc",
    cast: "timestamptz",
    value: (r) => r.createdAt.toISOString(),
  },
  priority: {
    expr: sql`${s.serviceRequests.priority}`,
    dir: "desc",
    cast: "request_priority",
    value: (r) => r.priority,
  },
  due: {
    expr: sql`coalesce(${s.serviceRequests.resolutionDueAt}, 'infinity'::timestamptz)`,
    dir: "asc",
    cast: "timestamptz",
    value: (r) => (r.resolutionDueAt ? r.resolutionDueAt.toISOString() : "infinity"),
  },
};

/* ---------------------------------------------------------------- queries */

export async function listRequests(db: Database, user: CurrentUser, q: RequestListInput) {
  const conds: (SQL | undefined)[] = [isNull(s.serviceRequests.deletedAt), visibilityCondition(user)];

  if (q.q) {
    const term = q.q.trim();
    conds.push(
      REF_PATTERN.test(term)
        ? eq(s.serviceRequests.refCode, term.toUpperCase())
        : or(
            sql`${s.serviceRequests.search} @@ websearch_to_tsquery('english', ${term})`,
            sql`${s.serviceRequests.refCode} ilike ${`%${term}%`}`,
            sql`${s.serviceRequests.title} % ${term}`,
          ),
    );
  }
  if (q.status?.length) conds.push(inArray(s.serviceRequests.status, q.status));
  if (q.priority?.length) conds.push(inArray(s.serviceRequests.priority, q.priority));
  if (q.category?.length) conds.push(inArray(s.requestCategories.slug, q.category));
  if (q.location) {
    conds.push(
      sql`${s.serviceRequests.locationId} in (select l.id from locations l where l.path <@ (select path from locations where id = ${q.location}))`,
    );
  }
  if (q.assignee === "me") conds.push(eq(s.serviceRequests.currentAssigneeId, user.id));
  else if (q.assignee === "none") conds.push(isNull(s.serviceRequests.currentAssigneeId));
  else if (q.assignee) conds.push(eq(s.serviceRequests.currentAssigneeId, q.assignee));
  if (q.scope === "mine") conds.push(eq(s.serviceRequests.requesterId, user.id));
  if (q.open === "true") conds.push(inArray(s.serviceRequests.status, [...OPEN_STATUSES]));
  if (q.open === "false")
    conds.push(sql`${s.serviceRequests.status} not in ${sql.raw(`(${OPEN_STATUSES.map((x) => `'${x}'`).join(",")})`)}`);
  if (q.from) conds.push(gte(s.serviceRequests.createdAt, q.from));
  if (q.to) conds.push(lte(s.serviceRequests.createdAt, new Date(q.to.getTime() + 86_399_999)));
  if (q.sla === "breached") {
    conds.push(
      sql`(coalesce(${s.serviceRequests.resolvedAt}, now()) > ${s.serviceRequests.resolutionDueAt} and ${s.serviceRequests.status} not in ('rejected','cancelled'))`,
    );
  }
  if (q.sla === "at_risk") {
    conds.push(
      sql`(${s.serviceRequests.resolvedAt} is null and ${s.serviceRequests.status} in ${sql.raw(`(${OPEN_STATUSES.map((x) => `'${x}'`).join(",")})`)}
        and now() <= ${s.serviceRequests.resolutionDueAt}
        and (extract(epoch from ${s.serviceRequests.resolutionDueAt} - now()) / nullif(extract(epoch from ${s.serviceRequests.resolutionDueAt} - ${s.serviceRequests.createdAt}), 0)) < 0.25)`,
    );
  }

  const where = and(...conds.filter(Boolean));
  const sort = SORTS[q.sort];
  const cursor = decodeCursor(q.cursor);
  const keyset = cursor
    ? sort.dir === "desc"
      ? sql`(${sort.expr}, ${s.serviceRequests.id}) < (${cursor.v}::${sql.raw(sort.cast)}, ${cursor.id}::uuid)`
      : sql`(${sort.expr}, ${s.serviceRequests.id}) > (${cursor.v}::${sql.raw(sort.cast)}, ${cursor.id}::uuid)`
    : undefined;

  const order =
    sort.dir === "desc" ? [desc(sort.expr), desc(s.serviceRequests.id)] : [asc(sort.expr), asc(s.serviceRequests.id)];

  const [rows, totalRows] = await Promise.all([
    selectRequests(db)
      .where(and(where, keyset))
      .orderBy(...order)
      .limit(q.limit + 1),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.serviceRequests)
      .innerJoin(s.requestCategories, eq(s.requestCategories.id, s.serviceRequests.categoryId))
      .where(where),
  ]);

  const page = rows.slice(0, q.limit);
  const last = page.at(-1);
  const now = new Date();
  return {
    data: await Promise.all(page.map((r) => toSummary(db, r, now))),
    pageInfo: {
      nextCursor: rows.length > q.limit && last ? encodeCursor({ v: sort.value(last), id: last.id }) : null,
      total: Number(totalRows[0]?.n ?? 0),
      limit: q.limit,
    },
  };
}

export async function getRequest(db: Database, user: CurrentUser, idOrRef: string) {
  const row = await loadVisible(db, user, idOrRef);
  const [voted, rating, attachments] = await Promise.all([
    db
      .select({ u: s.requestVotes.userId })
      .from(s.requestVotes)
      .where(and(eq(s.requestVotes.requestId, row.id), eq(s.requestVotes.userId, user.id)))
      .limit(1),
    db
      .select({ score: s.ratings.score, comment: s.ratings.comment })
      .from(s.ratings)
      .where(eq(s.ratings.requestId, row.id))
      .limit(1),
    listAttachments(db, row.id),
  ]);
  const isOwner = row.requesterId === user.id;
  const open = OPEN_STATUSES.includes(row.status);
  return {
    ...(await toSummary(db, row)),
    description: row.description,
    locationDetail: row.locationDetail,
    firstResponseAt: iso(row.firstResponseAt),
    hasVoted: voted.length > 0,
    rating: rating[0] ?? null,
    attachments,
    availableTransitions: availableTransitions(transitionContext(user, row)).map((t) => ({
      to: t.to,
      label: t.label,
      requiresNote: Boolean(t.requiresNote),
      requiresAssignee: Boolean(t.requiresAssignee),
    })),
    can: {
      edit: (isOwner && ["submitted", "triaged"].includes(row.status)) || (user.role === "admin" && open),
      assign: can(user.role, "request:assign") && open,
      comment: true,
      internalNotes: can(user.role, "comment:internal"),
      vote: can(user.role, "request:vote") && !isOwner && open,
      upload: uploadKinds(user, row, isOwner, open),
    },
  };
}

/** Photo kinds the viewer may add now (mirrors the checks in addAttachment). */
function uploadKinds(
  user: CurrentUser,
  row: Row,
  isOwner: boolean,
  open: boolean,
): ("evidence" | "before" | "after")[] {
  if (user.role === "admin") return ["evidence", "before", "after"];
  const kinds: ("evidence" | "before" | "after")[] = [];
  if (isOwner && open) kinds.push("evidence");
  if (
    user.role === "officer" &&
    row.currentAssigneeId === user.id &&
    ["assigned", "in_progress", "on_hold", "resolved"].includes(row.status)
  ) {
    kinds.push("before", "after");
  }
  return kinds;
}

/* ---------------------------------------------------------------- writes */
