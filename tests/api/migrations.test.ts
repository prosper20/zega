import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withActor } from "@/server/db/actor";
import * as s from "@/server/db/schema";
import { rowsOf } from "@/server/db/types";

import { createTestDb } from "../helpers/test-db";

let ctx: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
  ctx = await createTestDb();
});
afterAll(() => ctx.close());

describe("database migrations", () => {
  it("derives ltree paths for nested locations and cascades on rename", async () => {
    const { db } = ctx;
    const [campus] = await db.insert(s.locations).values({ name: "Main", code: "MAIN", kind: "campus" }).returning();
    const [hall] = await db
      .insert(s.locations)
      .values({ name: "Hostel B", code: "HOSTEL-B", kind: "hostel", parentId: campus.id })
      .returning();
    const [room] = await db
      .insert(s.locations)
      .values({ name: "Room 12", code: "HB-12", kind: "room", parentId: hall.id })
      .returning();
    expect(room.path).toBe("main.hostel_b.hb_12");

    await db.update(s.locations).set({ code: "HALL-B" }).where(sql`id = ${hall.id}`);
    const rows = rowsOf<{ path: string }>(
      await db.execute(sql`select path::text from locations where id = ${room.id}`),
    );
    expect(rows[0].path).toBe("main.hall_b.hb_12");
  });

  it("records audited writes with the actor and an intact hash chain", async () => {
    const { db } = ctx;
    await db.insert(s.roles).values({ slug: "admin", label: "Admin", description: "x" }).onConflictDoNothing();
    await withActor(db, "user_123", async (tx) => {
      await tx.update(s.roles).set({ label: "Administrator" }).where(sql`slug = 'admin'`);
    });
    const logs = rowsOf<{ actor_id: string; diff: { changes: Record<string, unknown> } }>(
      await db.execute(sql`select actor_id, diff from audit_logs where table_name = 'roles' and action = 'UPDATE'`),
    );
    expect(logs[0].actor_id).toBe("user_123");
    expect(logs[0].diff.changes).toHaveProperty("label");

    const verify = rowsOf<{ first_broken_id: string | null }>(
      await db.execute(sql`select * from audit_verify_chain()`),
    );
    expect(verify[0].first_broken_id).toBeNull();
  });

  it("rejects edits to the audit log", async () => {
    const error = await ctx.db.execute(sql`delete from audit_logs`).catch((e: Error) => e);
    expect(String((error as Error).cause)).toMatch(/append-only/);
  });
});

describe("audit log protection", () => {
  it("blocks TRUNCATE as well as DELETE", async () => {
    const error = await ctx.db.execute(sql`truncate audit_logs`).catch((e: Error) => e);
    expect(String((error as Error).cause)).toMatch(/append-only/);
  });
});
