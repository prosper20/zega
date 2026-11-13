/** Changing requests: create, edit, delete, status transitions and assignment. */
import { and, eq, isNull } from "drizzle-orm";

import type { RequestStatus } from "@/domain/constants";
import { can } from "@/domain/permissions";
import { checkTransition } from "@/domain/request-machine";
import { computeDueDates } from "@/domain/sla";
import { problems } from "@/server/api/problem";
import type {
  AssignInput,
  CreateRequestInput,
  TransitionInput,
  UpdateRequestInput,
} from "@/server/api/schemas/requests";
import { withActor } from "@/server/db/actor";
import * as s from "@/server/db/schema";
import type { Database, DbOrTx } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";

import { getLocationIndex } from "../locations";
import { adminIds, notify } from "../notify";
import { getRequest } from "./queries";
import { loadVisible, transitionContext } from "./shared";

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
