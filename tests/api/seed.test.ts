import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedDatabase } from "@/server/db/seed";
import { rowsOf } from "@/server/db/types";

import { createTestDb } from "../helpers/test-db";

let ctx: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
  ctx = await createTestDb();
  await seedDatabase(ctx.db, { requests: 60, students: 8, now: new Date("2026-11-12T12:00:00Z") });
}, 120_000);
afterAll(() => ctx.close());

const one = async <T>(q: ReturnType<typeof sql>) => rowsOf<T>(await ctx.db.execute(q))[0];

describe("seed", () => {
  it("creates the four roles and demo accounts with credential logins", async () => {
    const roles = await one<{ n: number }>(sql`select count(*)::int as n from roles`);
    expect(roles.n).toBe(4);
    const demo = await one<{ n: number }>(
      sql`select count(*)::int as n from users u join accounts a on a.user_id = u.id and a.provider_id = 'credential' where u.email like '%@zega.test'`,
    );
    expect(demo.n).toBeGreaterThan(10);
  });

  it("keeps each request's current status equal to its latest status log", async () => {
    const mismatches = await one<{ n: number }>(sql`
      select count(*)::int as n from service_requests r
      where r.status <> (select l.to_status from status_logs l where l.request_id = r.id order by l.created_at desc, l.id desc limit 1)`);
    expect(mismatches.n).toBe(0);
  });

  it("generates chronological reference codes", async () => {
    const first = await one<{ ref_code: string }>(
      sql`select ref_code from service_requests order by created_at limit 1`,
    );
    expect(first.ref_code).toBe("ZG-26-000001");
  });

  it("assigns officers to every request that reached work", async () => {
    const missing = await one<{ n: number }>(
      sql`select count(*)::int as n from service_requests where status in ('assigned','in_progress','on_hold','resolved') and current_assignee_id is null`,
    );
    expect(missing.n).toBe(0);
  });

  it("records the seed on an intact audit chain, attributed to the system", async () => {
    const audit = await one<{ n: number; actors: string[] }>(
      sql`select count(*)::int as n, array_agg(distinct actor_id) as actors from audit_logs`,
    );
    expect(audit.n).toBeGreaterThan(100);
    expect(audit.actors).toEqual(["system"]);
    const verify = await one<{ first_broken_id: string | null }>(sql`select * from audit_verify_chain()`);
    expect(verify.first_broken_id).toBeNull();
  });

  it("refuses to seed twice", async () => {
    await expect(seedDatabase(ctx.db)).rejects.toThrow(/already seeded/);
  });
});
