import { hashPassword } from "better-auth/crypto";
import { and, asc, eq, ilike, inArray, or, type SQL, sql } from "drizzle-orm";

import type { RoleSlug } from "@/domain/constants";
import { problems } from "@/server/api/problem";
import { withActor } from "@/server/db/actor";
import * as s from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import { log } from "@/server/log";
import type { CurrentUser } from "@/server/session-types";

/** Blank form fields are stored as NULL rather than empty strings. */
const emptyToNull = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);

const columns = {
  id: s.users.id,
  name: s.users.name,
  email: s.users.email,
  role: s.users.role,
  department: s.users.department,
  phone: s.users.phone,
  matricOrStaffNo: s.users.matricOrStaffNo,
  banned: s.users.banned,
  createdAt: s.users.createdAt,
};

async function withSpecialties<T extends { id: string; createdAt: Date; role: string; banned: boolean | null }>(
  db: Database,
  rows: T[],
) {
  const officers = rows.filter((r) => r.role === "officer").map((r) => r.id);
  const specs = officers.length
    ? await db
        .select({ officerId: s.officerSpecialties.officerId, slug: s.requestCategories.slug })
        .from(s.officerSpecialties)
        .innerJoin(s.requestCategories, eq(s.requestCategories.id, s.officerSpecialties.categoryId))
        .where(inArray(s.officerSpecialties.officerId, officers))
    : [];
  return rows.map((r) => ({
    ...r,
    role: r.role as RoleSlug,
    banned: Boolean(r.banned),
    createdAt: r.createdAt.toISOString(),
    specialties: specs.filter((x) => x.officerId === r.id).map((x) => x.slug),
  }));
}

export async function listUsers(db: Database, q: { q?: string; role?: RoleSlug; limit: number; offset: number }) {
  const conds: SQL[] = [];
  if (q.q) {
    const term = `%${q.q.trim()}%`;
    conds.push(or(ilike(s.users.name, term), ilike(s.users.email, term), ilike(s.users.matricOrStaffNo, term))!);
  }
  if (q.role) conds.push(eq(s.users.role, q.role));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db.select(columns).from(s.users).where(where).orderBy(asc(s.users.name)).limit(q.limit).offset(q.offset),
    db.select({ n: sql<number>`count(*)::int` }).from(s.users).where(where),
  ]);
  return { data: await withSpecialties(db, rows), total: Number(n) };
}

export async function getUser(db: Database, id: string) {
  const rows = await db.select(columns).from(s.users).where(eq(s.users.id, id));
  if (!rows.length) throw problems.notFound("User");
  return (await withSpecialties(db, rows))[0];
}

/** Admin-created accounts (typically officers and admins), with a temporary password. */
export async function createUser(
  db: Database,
  admin: CurrentUser,
  input: {
    name: string;
    email: string;
    password: string;
    role: RoleSlug;
    department?: string;
    phone?: string;
    matricOrStaffNo?: string;
  },
) {
  const email = input.email.trim().toLowerCase();
  const exists = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
  if (exists.length) throw problems.conflict("A user with this email already exists.", "email-taken");
  const id = `usr_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const password = await hashPassword(input.password);
  await withActor(db, admin.id, async (tx) => {
    await tx.insert(s.users).values({
      id,
      name: input.name.trim(),
      email,
      emailVerified: true,
      role: input.role,
      department: emptyToNull(input.department),
      phone: emptyToNull(input.phone),
      matricOrStaffNo: emptyToNull(input.matricOrStaffNo?.toUpperCase()),
    });
    await tx
      .insert(s.accounts)
      .values({ id: `acc_${id.slice(4)}`, accountId: id, providerId: "credential", userId: id, password });
  });
  return getUser(db, id);
}

export async function updateUser(
  db: Database,
  admin: CurrentUser,
  id: string,
  input: { role?: RoleSlug; banned?: boolean; banReason?: string; department?: string | null; name?: string },
) {
  if (id === admin.id && input.role && input.role !== "admin")
    throw problems.conflict("You cannot remove your own admin role.", "self-demotion");
  if (id === admin.id && input.banned) throw problems.conflict("You cannot deactivate your own account.", "self-ban");
  const target = await getUser(db, id);
  if (input.role && input.role !== "officer" && target.role === "officer") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.serviceRequests)
      .where(
        and(
          eq(s.serviceRequests.currentAssigneeId, id),
          inArray(s.serviceRequests.status, ["assigned", "in_progress", "on_hold"]),
        ),
      );
    if (Number(n) > 0) throw problems.conflict(`Reassign this officer's ${n} open job(s) first.`, "officer-has-jobs");
  }
  await withActor(db, admin.id, async (tx) => {
    const { banReason, ...rest } = input;
    await tx
      .update(s.users)
      .set({
        ...rest,
        ...(input.banned !== undefined
          ? { banReason: input.banned ? (banReason ?? "Deactivated by an administrator") : null }
          : {}),
      })
      .where(eq(s.users.id, id));
    // Deactivating or changing role ends existing sessions so the change applies immediately.
    if (input.banned || input.role) await tx.delete(s.sessions).where(eq(s.sessions.userId, id));
  });
  if (input.role && input.role !== target.role)
    log.security("user.role_changed", { actorId: admin.id, userId: id, from: target.role, to: input.role });
  if (input.banned !== undefined && input.banned !== target.banned)
    log.security(input.banned ? "user.deactivated" : "user.reactivated", { actorId: admin.id, userId: id });
  if (input.banned || input.role) log.security("user.sessions_revoked", { actorId: admin.id, userId: id });
  return getUser(db, id);
}

export async function setSpecialties(db: Database, admin: CurrentUser, id: string, categoryIds: string[]) {
  const target = await getUser(db, id);
  if (target.role !== "officer") throw problems.conflict("Only maintenance officers have specialties.", "not-officer");
  await withActor(db, admin.id, async (tx) => {
    await tx.delete(s.officerSpecialties).where(eq(s.officerSpecialties.officerId, id));
    if (categoryIds.length)
      await tx.insert(s.officerSpecialties).values(categoryIds.map((categoryId) => ({ officerId: id, categoryId })));
  });
  return getUser(db, id);
}
