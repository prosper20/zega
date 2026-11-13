import { and, asc, desc, eq, gte, inArray, isNull, lte, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { OPEN_STATUSES, type RequestStatus } from "@/domain/constants";
import { can } from "@/domain/permissions";
import { availableTransitions, checkTransition } from "@/domain/request-machine";
import { computeDueDates, resolutionSlaState, responseSlaState } from "@/domain/sla";
import { problems } from "@/server/api/problem";
import type {
  AssignInput,
  CreateRequestInput,
  RequestListInput,
  TransitionInput,
  UpdateRequestInput,
} from "@/server/api/schemas/requests";
import { withActor } from "@/server/db/actor";
import * as s from "@/server/db/schema";
import { type Database, type DbOrTx, rowsOf } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";

import { listAttachments } from "./attachments";
import { getLocationIndex } from "./locations";
import { adminIds, notify } from "./notify";

const requester = alias(s.users, "requester");
const assignee = alias(s.users, "assignee");
const REF_PATTERN = /^ZG-\d{2}-\d{6}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

const voteCount = sql<number>`(select count(*)::int from request_votes v where v.request_id = ${s.serviceRequests.id})`;

const baseColumns = {
  id: s.serviceRequests.id,
  refCode: s.serviceRequests.refCode,
  title: s.serviceRequests.title,
  description: s.serviceRequests.description,
  status: s.serviceRequests.status,
  priority: s.serviceRequests.priority,
  locationId: s.serviceRequests.locationId,
  locationDetail: s.serviceRequests.locationDetail,
  createdAt: s.serviceRequests.createdAt,
  updatedAt: s.serviceRequests.updatedAt,
  responseDueAt: s.serviceRequests.responseDueAt,
  resolutionDueAt: s.serviceRequests.resolutionDueAt,
  firstResponseAt: s.serviceRequests.firstResponseAt,
  resolvedAt: s.serviceRequests.resolvedAt,
  closedAt: s.serviceRequests.closedAt,
  requesterId: s.serviceRequests.requesterId,
  currentAssigneeId: s.serviceRequests.currentAssigneeId,
  category: {
    id: s.requestCategories.id,
    slug: s.requestCategories.slug,
    name: s.requestCategories.name,
    icon: s.requestCategories.icon,
  },
  requesterName: requester.name,
  requesterRole: requester.role,
  assigneeName: assignee.name,
  voteCount,
};

type Row = Awaited<ReturnType<typeof selectRequests>>[number];

function selectRequests(db: DbOrTx) {
  return db
    .select(baseColumns)
    .from(s.serviceRequests)
    .innerJoin(s.requestCategories, eq(s.requestCategories.id, s.serviceRequests.categoryId))
    .innerJoin(requester, eq(requester.id, s.serviceRequests.requesterId))
    .leftJoin(assignee, eq(assignee.id, s.serviceRequests.currentAssigneeId))
    .$dynamic();
}

async function toSummary(db: DbOrTx, r: Row, now = new Date()) {
  const loc = await getLocationIndex(db);
  const node = loc.byId.get(r.locationId);
  return {
    id: r.id,
    refCode: r.refCode,
    title: r.title,
    status: r.status,
    priority: r.priority,
    category: r.category,
    location: {
      id: r.locationId,
      name: node?.name ?? "Unknown",
      code: node?.code ?? "",
      label: loc.label(r.locationId),
    },
    requester: { id: r.requesterId, name: r.requesterName, role: r.requesterRole as CurrentUser["role"] },
    assignee: r.currentAssigneeId
      ? { id: r.currentAssigneeId, name: r.assigneeName ?? "Officer", role: "officer" as const }
      : null,
    voteCount: Number(r.voteCount),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    responseDueAt: iso(r.responseDueAt),
    resolutionDueAt: iso(r.resolutionDueAt),
    resolvedAt: iso(r.resolvedAt),
    closedAt: iso(r.closedAt),
    sla: {
      response: responseSlaState(r, now),
      resolution: resolutionSlaState(r, now),
    },
  };
}

/** Row-level visibility: requesters see what they reported or voted on, officers what is or was assigned to them. */
function visibilityCondition(user: CurrentUser): SQL | undefined {
  if (can(user.role, "request:read:all")) return undefined;
  if (user.role === "officer") {
    return or(
      eq(s.serviceRequests.currentAssigneeId, user.id),
      sql`exists (select 1 from assignments a where a.request_id = ${s.serviceRequests.id} and a.officer_id = ${user.id})`,
    );
  }
  return or(
    eq(s.serviceRequests.requesterId, user.id),
    sql`exists (select 1 from request_votes v where v.request_id = ${s.serviceRequests.id} and v.user_id = ${user.id})`,
  );
}

/* ---------------------------------------------------------------- cursor */

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

/** Loads a request the user may see, by UUID or reference code. Hidden requests are reported as not found. */
export async function loadVisible(db: DbOrTx, user: CurrentUser, idOrRef: string) {
  const key = UUID_PATTERN.test(idOrRef)
    ? eq(s.serviceRequests.id, idOrRef)
    : REF_PATTERN.test(idOrRef)
      ? eq(s.serviceRequests.refCode, idOrRef.toUpperCase())
      : undefined;
  if (!key) throw problems.notFound("Request");
  const [row] = await selectRequests(db)
    .where(and(key, isNull(s.serviceRequests.deletedAt), visibilityCondition(user)))
    .limit(1);
  if (!row) throw problems.notFound("Request");
  return row;
}

function transitionContext(
  user: CurrentUser,
  r: { status: RequestStatus; requesterId: string; currentAssigneeId: string | null },
) {
  return {
    status: r.status,
    userId: user.id,
    role: user.role,
    requesterId: r.requesterId,
    assigneeId: r.currentAssigneeId,
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

async function assertCategoryAndLocation(db: DbOrTx, categoryId?: string, locationId?: string) {
  if (categoryId) {
    const [c] = await db
      .select({ id: s.requestCategories.id, defaultPriority: s.requestCategories.defaultPriority })
      .from(s.requestCategories)
      .where(and(eq(s.requestCategories.id, categoryId), isNull(s.requestCategories.archivedAt)));
    if (!c) throw problems.invalid("Unknown category.", [{ path: "categoryId", message: "Unknown category." }]);
    if (!locationId) return { category: c };
  }
  if (locationId) {
    const loc = await getLocationIndex(db);
    if (!loc.byId.has(locationId))
      throw problems.invalid("Unknown location.", [{ path: "locationId", message: "Unknown location." }]);
  }
  return {};
}

export async function createRequest(db: Database, user: CurrentUser, input: CreateRequestInput) {
  if (!can(user.role, "request:create")) throw problems.forbidden("Only students and staff can report issues.");
  const { category } = await assertCategoryAndLocation(db, input.categoryId, undefined);
  await assertCategoryAndLocation(db, undefined, input.locationId);
  const priority = input.priority ?? category!.defaultPriority;

  const id = await withActor(db, user.id, async (tx) => {
    const [policy] = await tx
      .select()
      .from(s.slaPolicies)
      .where(and(eq(s.slaPolicies.categoryId, input.categoryId), eq(s.slaPolicies.priority, priority)));
    const now = new Date();
    const due = policy ? computeDueDates(now, policy) : { responseDueAt: null, resolutionDueAt: null };
    const [created] = await tx
      .insert(s.serviceRequests)
      .values({
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        locationId: input.locationId,
        locationDetail: input.locationDetail || null,
        priority,
        requesterId: user.id,
        createdAt: now,
        ...due,
      })
      .returning({ id: s.serviceRequests.id, refCode: s.serviceRequests.refCode });
    await tx
      .insert(s.statusLogs)
      .values({ requestId: created.id, toStatus: "submitted", actorId: user.id, createdAt: now });
    await notify(tx, {
      userIds: await adminIds(tx),
      type: "request.created",
      title: `New request ${created.refCode}`,
      body: input.title,
      requestId: created.id,
      exclude: user.id,
    });
    return created.id;
  });
  return getRequest(db, user, id);
}

export async function updateRequest(db: Database, user: CurrentUser, idOrRef: string, input: UpdateRequestInput) {
  const row = await loadVisible(db, user, idOrRef);
  const isAdmin = user.role === "admin";
  const isOwner = row.requesterId === user.id;
  if (!isAdmin && !(isOwner && ["submitted", "triaged"].includes(row.status))) {
    throw problems.forbidden("You can only edit your own requests before work starts.");
  }
  if (!isAdmin && (input.priority || input.categoryId)) {
    throw problems.forbidden("Only administrators can change the category or priority.");
  }
  await assertCategoryAndLocation(db, input.categoryId, input.locationId);
  await withActor(db, user.id, (tx) =>
    tx
      .update(s.serviceRequests)
      .set({ ...input, locationDetail: input.locationDetail === undefined ? undefined : input.locationDetail || null })
      .where(eq(s.serviceRequests.id, row.id)),
  );
  return getRequest(db, user, row.id);
}

export async function deleteRequest(db: Database, user: CurrentUser, idOrRef: string) {
  if (!can(user.role, "request:delete")) throw problems.forbidden("Only administrators can delete requests.");
  const row = await loadVisible(db, user, idOrRef);
  await withActor(db, user.id, (tx) =>
    tx.update(s.serviceRequests).set({ deletedAt: new Date() }).where(eq(s.serviceRequests.id, row.id)),
  );
}

export async function transitionRequest(db: Database, user: CurrentUser, idOrRef: string, input: TransitionInput) {
  const row = await loadVisible(db, user, idOrRef);
  const check = checkTransition(transitionContext(user, row), input.to, input.note);
  if (!check.ok) {
    const messages = {
      invalid_transition: `A ${row.status.replace("_", " ")} request cannot move to ${input.to.replace("_", " ")}.`,
      forbidden: "You are not allowed to make this change.",
      note_required: "Add a note explaining this change.",
      assignee_required: "Assign an officer first.",
    } as const;
    if (check.reason === "forbidden") throw problems.forbidden(messages.forbidden);
    if (check.reason === "note_required")
      throw problems.invalid(messages.note_required, [{ path: "note", message: messages.note_required }]);
    throw problems.conflict(messages[check.reason], check.reason.replace("_", "-"));
  }
  if (input.rating && !(input.to === "closed" && row.requesterId === user.id)) {
    throw problems.invalid("Only the requester can rate, when confirming the fix.");
  }

  const now = new Date();
  const from = row.status;
  const to = input.to;
  await withActor(db, user.id, async (tx) => {
    const patch: Partial<typeof s.serviceRequests.$inferInsert> = { status: to };
    if (!row.firstResponseAt && row.requesterId !== user.id) patch.firstResponseAt = now;
    if (to === "resolved") patch.resolvedAt = now;
    if (to === "reopened") patch.resolvedAt = null;
    if (to === "closed") patch.closedAt = now;
    if (to === "cancelled" || to === "rejected") {
      patch.currentAssigneeId = null;
      await tx
        .update(s.assignments)
        .set({ unassignedAt: now })
        .where(and(eq(s.assignments.requestId, row.id), isNull(s.assignments.unassignedAt)));
    }
    await tx.update(s.serviceRequests).set(patch).where(eq(s.serviceRequests.id, row.id));
    await tx.insert(s.statusLogs).values({
      requestId: row.id,
      fromStatus: from,
      toStatus: to,
      actorId: user.id,
      note: input.note || null,
      createdAt: now,
    });
    if (input.rating) {
      await tx.insert(s.ratings).values({
        requestId: row.id,
        ratedById: user.id,
        score: input.rating.score,
        comment: input.rating.comment || null,
      });
    }

    const pretty = to.replace("_", " ");
    if (to === "resolved") {
      await notify(tx, {
        userIds: [row.requesterId],
        type: "request.resolved",
        title: `${row.refCode} is resolved`,
        body: "Please confirm the fix or reopen it if the problem is still there.",
        requestId: row.id,
        data: { refCode: row.refCode, requestTitle: row.title },
        exclude: user.id,
      });
    } else {
      await notify(tx, {
        userIds: [row.requesterId, row.currentAssigneeId],
        type: to === "rejected" ? "request.rejected" : "request.status",
        title: `${row.refCode} is now ${pretty}`,
        body: input.note || row.title,
        requestId: row.id,
        data: { refCode: row.refCode, requestTitle: row.title },
        exclude: user.id,
      });
    }
    if (to === "reopened") {
      await notify(tx, {
        userIds: await adminIds(tx),
        type: "request.reopened",
        title: `${row.refCode} was reopened`,
        body: input.note ?? row.title,
        requestId: row.id,
        data: { refCode: row.refCode, requestTitle: row.title },
        exclude: user.id,
      });
    }
  });
  return getRequest(db, user, row.id);
}

export async function assignRequest(db: Database, user: CurrentUser, idOrRef: string, input: AssignInput) {
  if (!can(user.role, "request:assign")) throw problems.forbidden("Only administrators can assign requests.");
  const row = await loadVisible(db, user, idOrRef);
  const assignable: RequestStatus[] = ["submitted", "triaged", "assigned", "in_progress", "on_hold", "reopened"];
  if (!assignable.includes(row.status))
    throw problems.conflict(`A ${row.status} request cannot be assigned.`, "invalid-transition");
  const [officer] = await db
    .select({ id: s.users.id, name: s.users.name, role: s.users.role, banned: s.users.banned })
    .from(s.users)
    .where(eq(s.users.id, input.officerId));
  if (!officer || officer.role !== "officer" || officer.banned) {
    throw problems.invalid("Choose an active maintenance officer.", [
      { path: "officerId", message: "Not an active officer." },
    ]);
  }
  if (row.currentAssigneeId === officer.id)
    throw problems.conflict("This officer is already assigned.", "already-assigned");

  const now = new Date();
  await withActor(db, user.id, async (tx) => {
    await tx
      .update(s.assignments)
      .set({ unassignedAt: now })
      .where(and(eq(s.assignments.requestId, row.id), isNull(s.assignments.unassignedAt)));
    await tx.insert(s.assignments).values({
      requestId: row.id,
      officerId: officer.id,
      assignedById: user.id,
      note: input.note || null,
      assignedAt: now,
    });
    const moveToAssigned = ["submitted", "triaged", "reopened"].includes(row.status);
    await tx
      .update(s.serviceRequests)
      .set({
        currentAssigneeId: officer.id,
        ...(moveToAssigned ? { status: "assigned" as const } : {}),
        ...(row.firstResponseAt ? {} : { firstResponseAt: now }),
      })
      .where(eq(s.serviceRequests.id, row.id));
    if (moveToAssigned) {
      await tx.insert(s.statusLogs).values({
        requestId: row.id,
        fromStatus: row.status,
        toStatus: "assigned",
        actorId: user.id,
        note: input.note || null,
        createdAt: now,
      });
    }
    await notify(tx, {
      userIds: [officer.id],
      type: "request.assigned",
      title: `New job: ${row.refCode}`,
      body: row.title,
      requestId: row.id,
      data: { refCode: row.refCode, requestTitle: row.title },
      exclude: user.id,
    });
    await notify(tx, {
      userIds: [row.requesterId],
      type: "request.status",
      title: `${row.refCode} has been assigned`,
      body: `${officer.name} will handle your request.`,
      requestId: row.id,
      data: { refCode: row.refCode, requestTitle: row.title },
      exclude: user.id,
    });
    if (row.currentAssigneeId) {
      await notify(tx, {
        userIds: [row.currentAssigneeId],
        type: "request.unassigned",
        title: `${row.refCode} was reassigned`,
        body: row.title,
        requestId: row.id,
        data: { refCode: row.refCode, requestTitle: row.title },
        exclude: user.id,
      });
    }
  });
  return getRequest(db, user, row.id);
}

/* ---------------------------------------------------------------- comments, votes, timeline */

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

/** Open requests that look like the one being typed: same building (ltree) or similar title (pg_trgm). */
export async function findSimilar(
  db: Database,
  user: CurrentUser,
  input: { title: string; locationId?: string; categoryId?: string },
) {
  const sameArea = input.locationId
    ? sql`l.path <@ (select subpath(path, 0, least(nlevel(path), 2)) from locations where id = ${input.locationId})`
    : sql`true`;
  const rows = rowsOf<{
    id: string;
    ref_code: string;
    title: string;
    status: RequestStatus;
    location_id: string;
    created_at: Date | string;
    requester_id: string;
    votes: number;
    voted: boolean;
    sim: number;
  }>(
    await db.execute(sql`
      select r.id, r.ref_code, r.title, r.status, r.location_id, r.created_at, r.requester_id,
             (select count(*)::int from request_votes v where v.request_id = r.id) as votes,
             exists (select 1 from request_votes v where v.request_id = r.id and v.user_id = ${user.id}) as voted,
             similarity(r.title, ${input.title}) as sim
      from service_requests r
      join locations l on l.id = r.location_id
      where r.deleted_at is null
        and r.status in ${sql.raw(`(${OPEN_STATUSES.map((x) => `'${x}'`).join(",")})`)}
        and ${sameArea}
        and (similarity(r.title, ${input.title}) > 0.2
             ${input.categoryId && input.locationId ? sql`or (r.category_id = ${input.categoryId} and r.location_id = ${input.locationId})` : sql``})
      order by (r.location_id = ${input.locationId ?? null}) desc nulls last, sim desc
      limit 5`),
  );
  const loc = await getLocationIndex(db);
  return rows.map((r) => ({
    id: r.id,
    refCode: r.ref_code,
    title: r.title,
    status: r.status,
    location: loc.label(r.location_id),
    voteCount: Number(r.votes),
    hasVoted: Boolean(r.voted),
    mine: r.requester_id === user.id,
    similarity: Math.round(Number(r.sim) * 100) / 100,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

/** Ranks officers for a request: category specialists first, then by current open workload. */
export async function suggestOfficers(db: Database, user: CurrentUser, idOrRef: string) {
  if (!can(user.role, "request:assign")) throw problems.forbidden();
  const row = await loadVisible(db, user, idOrRef);
  const rows = rowsOf<{
    id: string;
    name: string;
    specialties: string[] | null;
    specialist: boolean;
    open_jobs: number;
  }>(
    await db.execute(sql`
      select u.id, u.name,
             array_remove(array_agg(distinct c.name), null) as specialties,
             bool_or(os.category_id = ${row.category.id}) as specialist,
             (select count(*)::int from service_requests r
               where r.current_assignee_id = u.id and r.deleted_at is null
                 and r.status in ${sql.raw(`(${OPEN_STATUSES.map((x) => `'${x}'`).join(",")})`)}) as open_jobs
      from users u
      left join officer_specialties os on os.officer_id = u.id
      left join request_categories c on c.id = os.category_id
      where u.role = 'officer' and coalesce(u.banned, false) = false
      group by u.id, u.name`),
  );
  const maxLoad = Math.max(1, ...rows.map((r) => Number(r.open_jobs)));
  return rows
    .map((r) => {
      const load = Number(r.open_jobs);
      const score = Math.round((r.specialist ? 60 : 0) + 40 * (1 - load / (maxLoad + 1)));
      return {
        officer: { id: r.id, name: r.name, role: "officer" as const },
        specialties: r.specialties ?? [],
        specialist: Boolean(r.specialist),
        openJobs: load,
        score,
      };
    })
    .filter((o) => o.officer.id !== row.currentAssigneeId)
    .sort((a, b) => b.score - a.score || a.openJobs - b.openJobs);
}
