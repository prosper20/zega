import { and, asc, eq, isNull } from "drizzle-orm";

import { REQUEST_PRIORITIES, type RequestPriority } from "@/domain/constants";
import { problems } from "@/server/api/problem";
import { withActor } from "@/server/db/actor";
import * as s from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";

import { getLocationIndex, invalidateLocations } from "./locations";

export async function listCategories(db: Database, includeArchived = false) {
  const [cats, policies] = await Promise.all([
    db
      .select()
      .from(s.requestCategories)
      .where(includeArchived ? undefined : isNull(s.requestCategories.archivedAt))
      .orderBy(asc(s.requestCategories.name)),
    db.select().from(s.slaPolicies),
  ]);
  const order = (p: RequestPriority) => REQUEST_PRIORITIES.indexOf(p);
  return cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
    defaultPriority: c.defaultPriority,
    archived: Boolean(c.archivedAt),
    sla: policies
      .filter((p) => p.categoryId === c.id)
      .sort((a, b) => order(a.priority) - order(b.priority))
      .map((p) => ({
        priority: p.priority,
        responseMinutes: p.responseMinutes,
        resolutionMinutes: p.resolutionMinutes,
      })),
  }));
}

export async function updateCategory(
  db: Database,
  user: CurrentUser,
  id: string,
  input: { name?: string; description?: string; icon?: string; defaultPriority?: RequestPriority; archived?: boolean },
) {
  const { archived, ...rest } = input;
  const updated = await withActor(db, user.id, (tx) =>
    tx
      .update(s.requestCategories)
      .set({ ...rest, ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }) })
      .where(eq(s.requestCategories.id, id))
      .returning({ id: s.requestCategories.id }),
  );
  if (!updated.length) throw problems.notFound("Category");
  return (await listCategories(db, true)).find((c) => c.id === id)!;
}

export async function setSlaPolicies(
  db: Database,
  user: CurrentUser,
  categoryId: string,
  policies: { priority: RequestPriority; responseMinutes: number; resolutionMinutes: number }[],
) {
  for (const p of policies) {
    if (p.resolutionMinutes < p.responseMinutes) {
      throw problems.invalid("Resolution target must be at least the response target.", [
        { path: `sla.${p.priority}`, message: "Resolution must be at least response." },
      ]);
    }
  }
  const [cat] = await db
    .select({ id: s.requestCategories.id })
    .from(s.requestCategories)
    .where(eq(s.requestCategories.id, categoryId));
  if (!cat) throw problems.notFound("Category");
  await withActor(db, user.id, async (tx) => {
    for (const p of policies) {
      await tx
        .insert(s.slaPolicies)
        .values({ categoryId, ...p })
        .onConflictDoUpdate({
          target: [s.slaPolicies.categoryId, s.slaPolicies.priority],
          set: { responseMinutes: p.responseMinutes, resolutionMinutes: p.resolutionMinutes },
        });
    }
  });
  return (await listCategories(db, true)).find((c) => c.id === categoryId)!;
}

export async function listLocations(db: Database) {
  const index = await getLocationIndex(db);
  return index.all.map((l) => ({
    id: l.id,
    parentId: l.parentId,
    name: l.name,
    code: l.code,
    kind: l.kind,
    path: l.path,
    label: index.label(l.id),
    qrToken: l.qrToken,
  }));
}

export async function createLocation(
  db: Database,
  user: CurrentUser,
  input: { name: string; code: string; kind: (typeof s.locationKind.enumValues)[number]; parentId?: string | null },
) {
  const [row] = await withActor(db, user.id, (tx) =>
    tx
      .insert(s.locations)
      .values({ ...input, code: input.code.toUpperCase(), parentId: input.parentId ?? null })
      .returning({ id: s.locations.id }),
  );
  invalidateLocations(db);
  return (await listLocations(db)).find((l) => l.id === row.id)!;
}

/** Resolves a QR sticker token to its location (used to pre-fill the report form). */
export async function locationByQr(db: Database, token: string) {
  const [row] = await db
    .select({ id: s.locations.id })
    .from(s.locations)
    .where(and(eq(s.locations.qrToken, token)));
  if (!row) throw problems.notFound("Location");
  return (await listLocations(db)).find((l) => l.id === row.id)!;
}
