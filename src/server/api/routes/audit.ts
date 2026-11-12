import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

import * as svc from "@/server/services/audit";

import type { AppEnv } from "../context";
import { authed, requirePermission } from "../guard";
import { errorResponses, json } from "../schemas/common";

const AuditEntrySchema = z
  .object({
    id: z.number().int(),
    tableName: z.string(),
    rowId: z.string(),
    action: z.enum(["INSERT", "UPDATE", "DELETE"]),
    actorId: z.string().nullable(),
    actorName: z.string().nullable(),
    diff: z.record(z.string(), z.unknown()),
    hash: z.string(),
    prevHash: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi("AuditEntry");

export function auditRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/audit",
      tags: ["Audit"],
      summary: "Audit trail (admin)",
      description:
        "Every insert, update and delete on audited tables, newest first, with the acting user and a JSON diff.",
      security: authed,
      request: {
        query: z.object({
          table: z.string().optional().openapi({ example: "service_requests" }),
          rowId: z.string().optional(),
          actor: z.string().optional(),
          before: z.coerce
            .number()
            .int()
            .optional()
            .openapi({ description: "Return entries with a smaller id (pagination)" }),
          limit: z.coerce.number().int().min(1).max(100).default(50),
        }),
      },
      responses: {
        200: json(
          z.object({ data: z.array(AuditEntrySchema), nextBefore: z.number().int().nullable() }),
          "Audit entries",
        ),
        ...errorResponses,
      },
    }),
    async (c) => {
      requirePermission(c, "audit:view");
      return c.json(await svc.listAudit(c.get("db"), c.req.valid("query")), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/audit/verify",
      tags: ["Audit"],
      summary: "Verify audit integrity (admin)",
      description:
        "Recomputes the SHA-256 hash chain over the whole audit log and reports the first tampered entry, if any.",
      security: authed,
      responses: {
        200: json(
          z
            .object({
              intact: z.boolean(),
              checked: z.number().int(),
              firstBrokenId: z.number().int().nullable(),
              durationMs: z.number(),
              verifiedAt: z.string(),
            })
            .openapi("AuditVerification"),
          "Verification result",
        ),
        ...errorResponses,
      },
    }),
    async (c) => {
      requirePermission(c, "audit:view");
      return c.json(await svc.verifyAudit(c.get("db")), 200);
    },
  );
}
