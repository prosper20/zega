import { eq } from "drizzle-orm";

import type { RoleSlug } from "@/domain/constants";
import { createApi } from "@/server/api/app";
import * as s from "@/server/db/schema";
import { seedDatabase } from "@/server/db/seed";
import type { Database } from "@/server/db/types";

import { createTestDb } from "./test-db";

export const NOW = new Date("2026-11-12T12:00:00Z");

/**
 * The real API on a seeded PGlite database. Tests authenticate with an `x-test-user` header
 * (a user id); everything else (validation, RBAC, services, SQL, triggers) is production code.
 */
export async function createTestApi() {
  const ctx = await createTestDb();
  await seedDatabase(ctx.db, { requests: 60, students: 8, now: NOW });
  const app = createApi({
    db: ctx.db,
    authenticate: async (req) => {
      const id = req.headers.get("x-test-user");
      if (!id) return null;
      const [u] = await ctx.db.select().from(s.users).where(eq(s.users.id, id));
      if (!u || u.banned) return null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        image: null,
        role: u.role as RoleSlug,
        department: u.department,
        matricOrStaffNo: u.matricOrStaffNo,
      };
    },
  });

  const userByEmail = async (email: string) => {
    const [u] = await ctx.db.select().from(s.users).where(eq(s.users.email, email));
    return u;
  };

  /** Calls the API as a user (or anonymously) and returns status, parsed body and headers. */
  const call = async (as: string | null, method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = {};
    if (as) headers["x-test-user"] = as;
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await app.request(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const type = res.headers.get("content-type") ?? "";
    const data = type.includes("json") ? await res.json() : await res.text();
    return { status: res.status, data: data as any, headers: res.headers };
  };

  return { ...ctx, app, call, userByEmail, db: ctx.db as Database };
}
