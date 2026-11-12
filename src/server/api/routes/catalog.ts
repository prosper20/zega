import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

import { REQUEST_PRIORITIES } from "@/domain/constants";
import * as svc from "@/server/services/catalog";

import type { AppEnv } from "../context";
import { authed, requirePermission, requireUser } from "../guard";
import { errorResponses, json, jsonBody, UuidParam } from "../schemas/common";
import { PriorityEnum } from "../schemas/requests";

const SlaSchema = z
  .object({
    priority: PriorityEnum,
    responseMinutes: z.number().int().min(5),
    resolutionMinutes: z.number().int().min(5),
  })
  .openapi("SlaPolicy");
const CategorySchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    defaultPriority: PriorityEnum,
    archived: z.boolean(),
    sla: z.array(SlaSchema),
  })
  .openapi("Category");
const LocationSchema = z
  .object({
    id: z.uuid(),
    parentId: z.uuid().nullable(),
    name: z.string(),
    code: z.string(),
    kind: z.string(),
    path: z.string().openapi({ example: "main.moremi.moremi_f2.moremi_f2_bath" }),
    label: z.string(),
    qrToken: z.string(),
  })
  .openapi("Location");

export function catalogRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/categories",
      tags: ["Catalog"],
      summary: "List request categories with SLA targets",
      security: authed,
      request: { query: z.object({ archived: z.enum(["true", "false"]).optional() }) },
      responses: { 200: json(z.array(CategorySchema), "Categories"), ...errorResponses },
    }),
    async (c) => {
      requireUser(c);
      return c.json(await svc.listCategories(c.get("db"), c.req.valid("query").archived === "true"), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/categories/{id}",
      tags: ["Catalog"],
      summary: "Update a category (admin)",
      security: authed,
      request: {
        params: UuidParam,
        body: jsonBody(
          z
            .object({
              name: z.string().trim().min(2).max(60),
              description: z.string().trim().max(200),
              icon: z.string().trim().max(40),
              defaultPriority: PriorityEnum,
              archived: z.boolean(),
            })
            .partial(),
        ),
      },
      responses: { 200: json(CategorySchema, "Updated category"), ...errorResponses },
    }),
    async (c) => {
      const user = requirePermission(c, "catalog:manage");
      return c.json(await svc.updateCategory(c.get("db"), user, c.req.valid("param").id, c.req.valid("json")), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "put",
      path: "/categories/{id}/sla",
      tags: ["Catalog"],
      summary: "Set SLA targets for a category (admin)",
      security: authed,
      request: {
        params: UuidParam,
        body: jsonBody(z.object({ policies: z.array(SlaSchema).min(1).max(REQUEST_PRIORITIES.length) })),
      },
      responses: { 200: json(CategorySchema, "Updated category"), ...errorResponses },
    }),
    async (c) => {
      const user = requirePermission(c, "catalog:manage");
      return c.json(
        await svc.setSlaPolicies(c.get("db"), user, c.req.valid("param").id, c.req.valid("json").policies),
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/locations",
      tags: ["Catalog"],
      summary: "List campus locations",
      description: "Flat list ordered by tree path; build the tree from `parentId`.",
      security: authed,
      responses: { 200: json(z.array(LocationSchema), "Locations"), ...errorResponses },
    }),
    async (c) => {
      requireUser(c);
      return c.json(await svc.listLocations(c.get("db")), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/locations",
      tags: ["Catalog"],
      summary: "Add a location (admin)",
      security: authed,
      request: {
        body: jsonBody(
          z.object({
            name: z.string().trim().min(2).max(80),
            code: z
              .string()
              .trim()
              .min(2)
              .max(30)
              .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes."),
            kind: z.enum(["campus", "building", "hostel", "floor", "room", "outdoor"]),
            parentId: z.uuid().nullable().optional(),
          }),
        ),
      },
      responses: { 201: json(LocationSchema, "The new location"), 409: errorResponses[422], ...errorResponses },
    }),
    async (c) => {
      const user = requirePermission(c, "catalog:manage");
      return c.json(await svc.createLocation(c.get("db"), user, c.req.valid("json")), 201);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/locations/qr/{token}",
      tags: ["Catalog"],
      summary: "Resolve a QR sticker",
      description: "Returns the location printed on a report-here QR sticker so the form can be pre-filled.",
      security: authed,
      request: {
        params: z.object({
          token: z
            .string()
            .min(6)
            .max(40)
            .openapi({ param: { name: "token", in: "path" } }),
        }),
      },
      responses: { 200: json(LocationSchema, "The location"), ...errorResponses },
    }),
    async (c) => {
      requireUser(c);
      return c.json(await svc.locationByQr(c.get("db"), c.req.valid("param").token), 200);
    },
  );
}
