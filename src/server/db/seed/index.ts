import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";

import {
  REQUEST_PRIORITIES,
  type RequestPriority,
  type RequestStatus,
  ROLE_SLUGS,
  type RoleSlug,
} from "@/domain/constants";
import { PERMISSIONS, ROLE_INFO, ROLE_PERMISSIONS } from "@/domain/permissions";
import { checkTransition } from "@/domain/request-machine";
import { computeDueDates } from "@/domain/sla";

import { SYSTEM_ACTOR } from "../actor";
import * as s from "../schema";
import type { Database, Tx } from "../types";
import {
  CATEGORIES,
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  DEPARTMENTS,
  DESCRIPTION_SNIPPETS,
  FIRST_NAMES,
  LAST_NAMES,
  LOCATION_TREE,
  OFFICER_NOTES,
  OFFICERS,
  SLA_BASELINE,
} from "./data";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Small deterministic PRNG so every seed run produces the same data. */
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
    weighted: <T extends string>(weights: Partial<Record<T, number>>): T => {
      const entries = Object.entries(weights) as [T, number][];
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let r = next() * total;
      for (const [k, w] of entries) {
        r -= w;
        if (r <= 0) return k;
      }
      return entries[entries.length - 1][0];
    },
  };
}

function id(prefix: string, n: number) {
  return `${prefix}_${n.toString(36).padStart(6, "0")}`;
}

export type SeedOptions = {
  /** Number of service requests to generate. */
  requests?: number;
  /** Number of student accounts (in addition to the demo student). */
  students?: number;
  /** Days of history to generate. */
  days?: number;
  now?: Date;
  log?: (msg: string) => void;
};

export type SeedResult = { users: number; locations: number; requests: number; statusLogs: number };

/**
 * Seeds a migrated, empty database with realistic campus data. Runs in one transaction with the
 * audit actor set to "system", so the audit trail records the seed like any other change.
 */
export async function seedDatabase(db: Database, opts: SeedOptions = {}): Promise<SeedResult> {
  const { requests: requestCount = 160, students: studentCount = 30, days = 90, now = new Date() } = opts;
  const log = opts.log ?? (() => undefined);
  const r = rng(2026);

  const existing = await db.select({ slug: s.roles.slug }).from(s.roles).limit(1);
  if (existing.length > 0) throw new Error("Database already seeded (roles exist). Reset it first.");

  log("Hashing demo passwords");
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${SYSTEM_ACTOR}, true)`);

    // ----- roles & permissions -------------------------------------------------
    await tx.insert(s.roles).values(ROLE_SLUGS.map((slug) => ({ slug, ...ROLE_INFO[slug] })));
    await tx
      .insert(s.permissions)
      .values(Object.entries(PERMISSIONS).map(([key, description]) => ({ key, description })));
    await tx
      .insert(s.rolePermissions)
      .values(
        ROLE_SLUGS.flatMap((roleSlug) =>
          ROLE_PERMISSIONS[roleSlug].map((permissionKey) => ({ roleSlug, permissionKey })),
        ),
      );
    log("Roles and permissions");

    // ----- categories & SLA policies --------------------------------------------
    const categories = await tx
      .insert(s.requestCategories)
      .values(
        CATEGORIES.map(({ slug, name, description, icon, defaultPriority }) => ({
          slug,
          name,
          description,
          icon,
          defaultPriority,
        })),
      )
      .returning();
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
    const policies = await tx
      .insert(s.slaPolicies)
      .values(
        CATEGORIES.flatMap((c) =>
          REQUEST_PRIORITIES.map((priority) => ({
            categoryId: categoryBySlug.get(c.slug)!.id,
            priority,
            responseMinutes: Math.round(SLA_BASELINE[priority].response * c.slaFactor),
            resolutionMinutes: Math.round(SLA_BASELINE[priority].resolution * c.slaFactor),
          })),
        ),
      )
      .returning();
    const policyFor = (categoryId: string, priority: RequestPriority) =>
      policies.find((p) => p.categoryId === categoryId && p.priority === priority)!;
    log("Categories and SLA policies");

    // ----- locations (parents first so the path trigger can resolve them) ------
    const leafLocations: { id: string; code: string; name: string; hostel: boolean }[] = [];
    let locationCount = 0;
    async function insertLocation(node: typeof LOCATION_TREE, parentId: string | null, inHostel: boolean) {
      const [row] = await tx
        .insert(s.locations)
        .values({ code: node.code, name: node.name, kind: node.kind, parentId })
        .returning({ id: s.locations.id });
      locationCount++;
      const hostel = inHostel || node.kind === "hostel";
      if (!node.children?.length) leafLocations.push({ id: row.id, code: node.code, name: node.name, hostel });
      for (const child of node.children ?? []) await insertLocation(child, row.id, hostel);
    }
    await insertLocation(LOCATION_TREE, null, false);
    log(`${locationCount} locations`);

    // ----- users --------------------------------------------------------------
    type SeedUser = {
      id: string;
      name: string;
      email: string;
      role: RoleSlug;
      department: string;
      idNo: string | null;
    };
    const users: SeedUser[] = [];
    let n = 1;
    for (const a of DEMO_ACCOUNTS) {
      users.push({
        id: id("usr", n++),
        name: a.name,
        email: a.email,
        role: a.role,
        department: a.department,
        idNo: a.idNo ?? null,
      });
    }
    users.push({
      id: id("usr", n++),
      name: "Bashir Lawal",
      email: "bashir.lawal@zega.test",
      role: "admin",
      department: "Works & Services",
      idNo: null,
    });
    for (const o of OFFICERS.slice(1)) {
      const email = `${o.name.toLowerCase().replace(/[^a-z]+/g, ".")}@zega.test`;
      users.push({
        id: id("usr", n++),
        name: o.name,
        email,
        role: "officer",
        department: "Works & Services",
        idNo: null,
      });
    }
    for (let i = 0; i < 8; i++) {
      const name = `${r.pick(FIRST_NAMES)} ${r.pick(LAST_NAMES)}`;
      users.push({
        id: id("usr", n++),
        name,
        email: `staff${i + 1}@zega.test`,
        role: "staff",
        department: r.pick(DEPARTMENTS),
        idNo: `STF/${String(500 + i).padStart(4, "0")}`,
      });
    }
    for (let i = 0; i < studentCount; i++) {
      const name = `${r.pick(FIRST_NAMES)} ${r.pick(LAST_NAMES)}`;
      users.push({
        id: id("usr", n++),
        name,
        email: `student${i + 1}@zega.test`,
        role: "student",
        department: r.pick(DEPARTMENTS),
        idNo: `ZU/${r.pick([2022, 2023, 2024, 2025])}/${String(1100 + i).padStart(5, "0")}`,
      });
    }
    const accountCreated = new Date(now.getTime() - (days + 30) * DAY);
    await tx.insert(s.users).values(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: true,
        role: u.role,
        department: u.department,
        matricOrStaffNo: u.idNo,
        createdAt: accountCreated,
        updatedAt: accountCreated,
      })),
    );
    await tx.insert(s.accounts).values(
      users.map((u, i) => ({
        id: id("acc", i + 1),
        accountId: u.id,
        providerId: "credential",
        userId: u.id,
        password: passwordHash,
        createdAt: accountCreated,
        updatedAt: accountCreated,
      })),
    );
    const officers = users.filter((u) => u.role === "officer");
    const admins = users.filter((u) => u.role === "admin");
    const requesters = users.filter((u) => u.role === "student" || u.role === "staff");
    await tx.insert(s.officerSpecialties).values(
      OFFICERS.flatMap((o) => {
        const officer = officers.find((u) => u.name === o.name)!;
        return o.specialties.map((slug) => ({ officerId: officer.id, categoryId: categoryBySlug.get(slug)!.id }));
      }),
    );
    log(`${users.length} users`);

    // ----- requests with full, valid lifecycles ----------------------------------
    const specialistsFor = (slug: string) => {
      const list = OFFICERS.filter((o) => o.specialties.includes(slug)).map(
        (o) => officers.find((u) => u.name === o.name)!,
      );
      return list.length ? list : officers;
    };

    type Step = { to: RequestStatus; at: Date; actorId: string; note: string | null };
    type Plan = {
      createdAt: Date;
      title: string;
      description: string;
      categoryId: string;
      categorySlug: string;
      locationId: string;
      priority: RequestPriority;
      requesterId: string;
      assignees: { officerId: string; by: string; at: Date }[];
      steps: Step[];
      rating: { score: number; comment: string | null; at: Date } | null;
    };

    const plans: Plan[] = [];
    for (let i = 0; i < requestCount; i++) {
      // Skew creation towards recent days so dashboards show a live backlog.
      const ageDays = Math.min(days, Math.floor(days * r.next() ** 1.6));
      const createdAt = new Date(now.getTime() - ageDays * DAY - r.int(0, 20) * HOUR - r.int(0, 59) * MIN);
      const cat = r.pick(CATEGORIES);
      const category = categoryBySlug.get(cat.slug)!;
      const priority: RequestPriority = r.chance(0.6)
        ? cat.defaultPriority
        : r.weighted<RequestPriority>({ low: 3, medium: 4, high: 2, urgent: 1 });
      const location =
        cat.slug === "hostel"
          ? r.pick(leafLocations.filter((l) => l.hostel))
          : r.pick(leafLocations.filter((l) => (cat.slug === "classroom-equipment" ? !l.hostel : true)));
      const requester = location.hostel ? r.pick(requesters.filter((u) => u.role === "student")) : r.pick(requesters);
      const policy = policyFor(category.id, priority);
      const age = now.getTime() - createdAt.getTime();

      const target: RequestStatus =
        age > 14 * DAY
          ? r.weighted<RequestStatus>({
              closed: 78,
              resolved: 4,
              rejected: 5,
              cancelled: 5,
              in_progress: 4,
              on_hold: 4,
            })
          : age > 3 * DAY
            ? r.weighted<RequestStatus>({
                closed: 35,
                resolved: 15,
                in_progress: 18,
                assigned: 14,
                on_hold: 6,
                reopened: 3,
                cancelled: 2,
                triaged: 7,
              })
            : r.weighted<RequestStatus>({ submitted: 30, triaged: 14, assigned: 24, in_progress: 20, resolved: 12 });

      // Most requests meet their SLA; about one in eight runs late.
      const late = r.chance(0.12);
      const budget = policy.resolutionMinutes * MIN * (late ? 1.3 + r.next() : 0.3 + r.next() * 0.6);
      const respond = Math.min(policy.responseMinutes * MIN * (late ? 1.4 : 0.2 + r.next() * 0.7), budget * 0.2);
      let t = createdAt.getTime();
      const advance = (ms: number) => {
        // Clamp into the past, but always move forward so a request's timeline is strictly ordered.
        t = Math.max(t + 1000, Math.min(t + Math.max(ms, 5 * MIN), now.getTime() - 5 * MIN));
        return new Date(t);
      };

      const admin = r.pick(admins);
      const officer = r.pick(specialistsFor(cat.slug));
      const assignees: Plan["assignees"] = [];
      const steps: Step[] = [];
      const push = (to: RequestStatus, at: Date, actorId: string, note: string | null = null) =>
        steps.push({ to, at, actorId, note });

      const path: RequestStatus[] = (() => {
        switch (target) {
          case "submitted":
            return [];
          case "triaged":
            return ["triaged"];
          case "assigned":
            return r.chance(0.4) ? ["triaged", "assigned"] : ["assigned"];
          case "in_progress":
            return ["assigned", "in_progress"];
          case "on_hold":
            return ["assigned", "in_progress", "on_hold"];
          case "resolved":
            return ["assigned", "in_progress", "resolved"];
          case "reopened":
            return ["assigned", "in_progress", "resolved", "reopened"];
          case "closed":
            return r.chance(0.15)
              ? ["assigned", "in_progress", "on_hold", "in_progress", "resolved", "closed"]
              : r.chance(0.06)
                ? ["assigned", "in_progress", "resolved", "reopened", "in_progress", "resolved", "closed"]
                : ["assigned", "in_progress", "resolved", "closed"];
          case "rejected":
            return ["rejected"];
          case "cancelled":
            return r.chance(0.5) ? ["cancelled"] : ["assigned", "cancelled"];
        }
      })();

      let assigneeId: string | null = null;
      let status: RequestStatus = "submitted";
      for (const [idx, to] of path.entries()) {
        const at =
          idx === 0
            ? advance(respond)
            : to === "resolved"
              ? advance(budget * (0.4 + r.next() * 0.4))
              : advance(budget * 0.08 * r.next());
        let actorId: string;
        let note: string | null = null;
        if (to === "assigned") {
          assigneeId = officer.id;
          assignees.push({ officerId: officer.id, by: admin.id, at });
          actorId = admin.id;
        } else if (to === "triaged" || to === "rejected") {
          actorId = admin.id;
          if (to === "rejected") note = "Duplicate of an existing request for this location.";
        } else if (to === "cancelled") {
          actorId = requester.id;
          note = "Problem fixed itself.";
        } else if (to === "closed" || to === "reopened") {
          actorId = requester.id;
          if (to === "reopened") note = "The problem has come back.";
        } else {
          actorId = assigneeId ?? officer.id;
          if (to === "on_hold") note = "Waiting for replacement parts from the store.";
          if (to === "resolved") note = r.pick(OFFICER_NOTES.slice(2));
        }
        const role: RoleSlug = actorId === requester.id ? requester.role : actorId === admin.id ? "admin" : "officer";
        const check = checkTransition(
          { status, userId: actorId, role, requesterId: requester.id, assigneeId },
          to,
          note,
        );
        if (!check.ok) throw new Error(`Seed produced an invalid transition ${status} -> ${to}: ${check.reason}`);
        push(to, at, actorId, note);
        status = to;
      }

      const closedStep = steps.find((st) => st.to === "closed");
      const rating =
        closedStep && r.chance(0.85)
          ? {
              score: r.weighted<"5" | "4" | "3" | "2" | "1">({ "5": 55, "4": 28, "3": 10, "2": 5, "1": 2 }),
              comment: r.chance(0.4)
                ? r.pick([
                    "Quick and professional.",
                    "Fixed properly, thank you!",
                    "Took a while but sorted.",
                    "Great service.",
                  ])
                : null,
              at: closedStep.at,
            }
          : null;

      plans.push({
        createdAt,
        title: r.pick(cat.titles),
        description: `${r.pick(cat.titles)} at ${location.name}. ${r.pick(DESCRIPTION_SNIPPETS)}`,
        categoryId: category.id,
        categorySlug: cat.slug,
        locationId: location.id,
        priority,
        requesterId: requester.id,
        assignees,
        steps,
        rating: rating && { ...rating, score: Number(rating.score) },
      });
    }

    // Insert in creation order so reference codes are chronological.
    plans.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const policyById = (p: Plan) => policyFor(p.categoryId, p.priority);
    const inserted = await insertChunked(tx, plans, 200, (chunk) =>
      tx
        .insert(s.serviceRequests)
        .values(
          chunk.map((p) => {
            const last = p.steps.at(-1);
            const resolved = [...p.steps].reverse().find((st) => st.to === "resolved");
            const { responseDueAt, resolutionDueAt } = computeDueDates(p.createdAt, policyById(p));
            return {
              title: p.title,
              description: p.description,
              categoryId: p.categoryId,
              locationId: p.locationId,
              priority: p.priority,
              status: last?.to ?? "submitted",
              requesterId: p.requesterId,
              currentAssigneeId:
                last && ["rejected", "cancelled"].includes(last.to) ? null : (p.assignees.at(-1)?.officerId ?? null),
              responseDueAt,
              resolutionDueAt,
              firstResponseAt: p.steps[0]?.at ?? null,
              resolvedAt: resolved && last?.to !== "reopened" ? resolved.at : null,
              closedAt: last?.to === "closed" ? last.at : null,
              createdAt: p.createdAt,
              updatedAt: last?.at ?? p.createdAt,
            };
          }),
        )
        .returning({ id: s.serviceRequests.id }),
    );
    log(`${inserted.length} requests`);

    const statusRows = plans.flatMap((p, i) => [
      {
        requestId: inserted[i].id,
        fromStatus: null,
        toStatus: "submitted" as const,
        actorId: p.requesterId,
        note: null,
        createdAt: p.createdAt,
      },
      ...p.steps.map((st, j) => ({
        requestId: inserted[i].id,
        fromStatus: j === 0 ? ("submitted" as const) : p.steps[j - 1].to,
        toStatus: st.to,
        actorId: st.actorId,
        note: st.note,
        createdAt: st.at,
      })),
    ]);
    await insertChunked(tx, statusRows, 500, (chunk) => tx.insert(s.statusLogs).values(chunk));

    const assignmentRows = plans.flatMap((p, i) =>
      p.assignees.map((a) => ({
        requestId: inserted[i].id,
        officerId: a.officerId,
        assignedById: a.by,
        assignedAt: a.at,
      })),
    );
    if (assignmentRows.length)
      await insertChunked(tx, assignmentRows, 500, (chunk) => tx.insert(s.assignments).values(chunk));

    const ratingRows = plans.flatMap((p, i) =>
      p.rating
        ? [
            {
              requestId: inserted[i].id,
              ratedById: p.requesterId,
              score: p.rating.score,
              comment: p.rating.comment,
              createdAt: p.rating.at,
            },
          ]
        : [],
    );
    if (ratingRows.length) await tx.insert(s.ratings).values(ratingRows);

    const commentRows = plans.flatMap((p, i) => {
      const working = p.steps.find((st) => st.to === "in_progress");
      if (!working || !r.chance(0.45)) return [];
      const officerId = p.assignees.at(-1)!.officerId;
      const rows = [
        {
          requestId: inserted[i].id,
          authorId: officerId,
          body: r.pick(OFFICER_NOTES.slice(0, 2)),
          internal: false,
          createdAt: new Date(working.at.getTime() + 10 * MIN),
        },
      ];
      if (r.chance(0.4)) {
        rows.push({
          requestId: inserted[i].id,
          authorId: p.requesterId,
          body: "Thank you, please keep me posted.",
          internal: false,
          createdAt: new Date(working.at.getTime() + 40 * MIN),
        });
      }
      if (r.chance(0.3)) {
        rows.push({
          requestId: inserted[i].id,
          authorId: officerId,
          body: "Store has the part, collecting at 2pm.",
          internal: true,
          createdAt: new Date(working.at.getTime() + 25 * MIN),
        });
      }
      return rows.filter((c) => c.createdAt < now);
    });
    if (commentRows.length) await insertChunked(tx, commentRows, 500, (chunk) => tx.insert(s.comments).values(chunk));

    const voteRows = plans.flatMap((p, i) => {
      if (!r.chance(0.25)) return [];
      const voters = new Set<string>();
      const count = r.int(1, 6);
      while (voters.size < count) {
        const v = r.pick(requesters);
        if (v.id !== p.requesterId) voters.add(v.id);
      }
      return [...voters]
        .map((userId) => ({
          requestId: inserted[i].id,
          userId,
          createdAt: new Date(p.createdAt.getTime() + r.int(1, 48) * HOUR),
        }))
        .filter((v) => v.createdAt < now);
    });
    if (voteRows.length) await insertChunked(tx, voteRows, 500, (chunk) => tx.insert(s.requestVotes).values(chunk));

    // A few unread notifications for the demo accounts.
    const demo = Object.fromEntries(DEMO_ACCOUNTS.map((a) => [a.role, users.find((u) => u.email === a.email)!]));
    const recentForStudent = plans
      .map((p, i) => ({ p, row: inserted[i] }))
      .filter(({ p }) => p.requesterId === demo.student.id)
      .slice(-3);
    const notificationRows = [
      ...recentForStudent.map(({ p, row }) => ({
        userId: demo.student.id,
        type: "request.status",
        title: `Your request is ${(p.steps.at(-1)?.to ?? "submitted").replace("_", " ")}`,
        body: p.title,
        requestId: row.id,
        createdAt: p.steps.at(-1)?.at ?? p.createdAt,
      })),
      {
        userId: demo.admin.id,
        type: "sla.breach",
        title: "SLA breached",
        body: "A high priority request has passed its resolution target.",
        requestId: inserted.at(-1)!.id,
        createdAt: now,
      },
    ];
    await tx.insert(s.notifications).values(notificationRows);
    log("Status history, assignments, ratings, comments, votes and notifications");

    return { users: users.length, locations: locationCount, requests: inserted.length, statusLogs: statusRows.length };
  });
}

async function insertChunked<T, R>(
  _tx: Tx,
  rows: T[],
  size: number,
  insert: (chunk: T[]) => Promise<R> | PromiseLike<R>,
) {
  const out: unknown[] = [];
  for (let i = 0; i < rows.length; i += size) {
    const res = await insert(rows.slice(i, i + size));
    if (Array.isArray(res)) out.push(...res);
  }
  return out as R extends (infer U)[] ? U[] : never[];
}
