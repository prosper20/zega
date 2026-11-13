/** Building blocks shared by the request services: row selection, summaries, visibility and lookup. */
import { and, eq, isNull, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { RequestStatus } from "@/domain/constants";
import { can } from "@/domain/permissions";
import { resolutionSlaState, responseSlaState } from "@/domain/sla";
import { problems } from "@/server/api/problem";
import * as s from "@/server/db/schema";
import type { DbOrTx } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";

import { getLocationIndex } from "../locations";

export const requester = alias(s.users, "requester");
export const assignee = alias(s.users, "assignee");
export const REF_PATTERN = /^ZG-\d{2}-\d{6}$/i;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export const voteCount = sql<number>`(select count(*)::int from request_votes v where v.request_id = ${s.serviceRequests.id})`;

export const baseColumns = {
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

export type Row = Awaited<ReturnType<typeof selectRequests>>[number];

export function selectRequests(db: DbOrTx) {
  return db
    .select(baseColumns)
    .from(s.serviceRequests)
    .innerJoin(s.requestCategories, eq(s.requestCategories.id, s.serviceRequests.categoryId))
    .innerJoin(requester, eq(requester.id, s.serviceRequests.requesterId))
    .leftJoin(assignee, eq(assignee.id, s.serviceRequests.currentAssigneeId))
    .$dynamic();
}

export async function toSummary(db: DbOrTx, r: Row, now = new Date()) {
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
export function visibilityCondition(user: CurrentUser): SQL | undefined {
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

export function transitionContext(
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
