import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";

import { ROLE_SLUGS } from "@/domain/constants";
import { ROLE_PERMISSIONS } from "@/domain/permissions";

import type { AppEnv } from "../context";
import { authed, requireUser } from "../guard";
import { errorResponses, json } from "../schemas/common";

export function systemRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/health",
      tags: ["System"],
      summary: "Health check",
      description: "Public. Confirms the API is up and the database is reachable (used to verify the deployment).",
      responses: {
        200: json(
          z
            .object({
              status: z.literal("ok"),
              database: z.object({ ok: z.boolean(), latencyMs: z.number() }),
              version: z.string(),
              time: z.string(),
            })
            .openapi("Health"),
          "Healthy",
        ),
        503: json(
          z.object({ status: z.literal("degraded"), database: z.object({ ok: z.boolean(), error: z.string() }) }),
          "Database unreachable",
        ),
      },
    }),
    async (c) => {
      const started = Date.now();
      try {
        await c.get("db").execute(sql`select 1`);
        return c.json(
          {
            status: "ok" as const,
            database: { ok: true, latencyMs: Date.now() - started },
            version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
            time: new Date().toISOString(),
          },
          200,
        );
      } catch (e) {
        return c.json(
          { status: "degraded" as const, database: { ok: false, error: (e as Error).message.slice(0, 120) } },
          503,
        );
      }
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/me",
      tags: ["System"],
      summary: "Who am I",
      description: "The signed-in user and the permissions their role grants.",
      security: authed,
      responses: {
        200: json(
          z
            .object({
              id: z.string(),
              name: z.string(),
              email: z.string(),
              role: z.enum(ROLE_SLUGS),
              department: z.string().nullable(),
              matricOrStaffNo: z.string().nullable(),
              permissions: z.array(z.string()),
            })
            .openapi("Me"),
          "The current user",
        ),
        ...errorResponses,
      },
    }),
    async (c) => {
      const u = requireUser(c);
      return c.json(
        {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          matricOrStaffNo: u.matricOrStaffNo,
          permissions: [...ROLE_PERMISSIONS[u.role]],
        },
        200,
      );
    },
  );
}
