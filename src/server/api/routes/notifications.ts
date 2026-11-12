import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

import * as svc from "@/server/services/notifications";

import type { AppEnv } from "../context";
import { authed, requireUser } from "../guard";
import { errorResponses, json, jsonBody } from "../schemas/common";

const NotificationSchema = z
  .object({
    id: z.uuid(),
    type: z.string().openapi({ example: "request.assigned" }),
    title: z.string(),
    body: z.string(),
    requestId: z.uuid().nullable(),
    refCode: z.string().nullable(),
    readAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi("Notification");

export function notificationRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/notifications",
      tags: ["Notifications"],
      summary: "Your notifications",
      security: authed,
      request: {
        query: z.object({
          unread: z.enum(["true", "false"]).optional(),
          before: z
            .string()
            .datetime()
            .optional()
            .openapi({ description: "Return notifications older than this time" }),
          limit: z.coerce.number().int().min(1).max(50).default(20),
        }),
      },
      responses: {
        200: json(z.object({ data: z.array(NotificationSchema), unread: z.number().int() }), "Notifications"),
        ...errorResponses,
      },
    }),
    async (c) => {
      const q = c.req.valid("query");
      return c.json(
        await svc.listNotifications(c.get("db"), requireUser(c), { ...q, unread: q.unread === "true" }),
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/notifications/read",
      tags: ["Notifications"],
      summary: "Mark notifications as read",
      security: authed,
      request: { body: jsonBody(z.object({ ids: z.union([z.array(z.uuid()).min(1), z.literal("all")]) })) },
      responses: { 200: json(z.object({ unread: z.number().int() }), "Remaining unread count"), ...errorResponses },
    }),
    async (c) => c.json(await svc.markRead(c.get("db"), requireUser(c), c.req.valid("json").ids), 200),
  );
}
