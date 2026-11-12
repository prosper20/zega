import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

import { ROLE_SLUGS } from "@/domain/constants";
import { passwordSchema } from "@/domain/schemas/auth";
import * as svc from "@/server/services/users";

import type { AppEnv } from "../context";
import { authed, requirePermission } from "../guard";
import { errorResponses, json, jsonBody, UserIdParam } from "../schemas/common";

const tags = ["Users"];
const RoleEnum = z.enum(ROLE_SLUGS).openapi("Role");
const UserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: RoleEnum,
    department: z.string().nullable(),
    phone: z.string().nullable(),
    matricOrStaffNo: z.string().nullable(),
    banned: z.boolean(),
    createdAt: z.string().datetime(),
    specialties: z.array(z.string()).openapi({ description: "Category slugs (officers only)" }),
  })
  .openapi("User");

export function userRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/users",
      tags,
      summary: "List users (admin)",
      security: authed,
      request: {
        query: z.object({
          q: z.string().trim().max(100).optional(),
          role: RoleEnum.optional(),
          limit: z.coerce.number().int().min(1).max(100).default(25),
          offset: z.coerce.number().int().min(0).default(0),
        }),
      },
      responses: {
        200: json(z.object({ data: z.array(UserSchema), total: z.number().int() }), "Users"),
        ...errorResponses,
      },
    }),
    async (c) => {
      requirePermission(c, "user:manage");
      return c.json(await svc.listUsers(c.get("db"), c.req.valid("query")), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/users",
      tags,
      summary: "Create a user (admin)",
      description: "Used to add maintenance officers and administrators, who cannot self-register.",
      security: authed,
      request: {
        body: jsonBody(
          z.object({
            name: z.string().trim().min(2).max(80),
            email: z.string().trim().toLowerCase().pipe(z.email()),
            password: passwordSchema,
            role: RoleEnum,
            department: z.string().trim().max(80).optional(),
            phone: z.string().trim().max(30).optional(),
            matricOrStaffNo: z.string().trim().max(30).optional(),
          }),
        ),
      },
      responses: { 201: json(UserSchema, "The new user"), 409: errorResponses[422], ...errorResponses },
    }),
    async (c) => {
      const admin = requirePermission(c, "user:manage");
      return c.json(await svc.createUser(c.get("db"), admin, c.req.valid("json")), 201);
    },
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/users/{id}",
      tags,
      summary: "Change role or deactivate (admin)",
      description: "Role changes and deactivation sign the user out everywhere immediately.",
      security: authed,
      request: {
        params: UserIdParam,
        body: jsonBody(
          z
            .object({
              name: z.string().trim().min(2).max(80),
              role: RoleEnum,
              banned: z.boolean(),
              banReason: z.string().trim().max(200),
              department: z.string().trim().max(80).nullable(),
            })
            .partial(),
        ),
      },
      responses: { 200: json(UserSchema, "Updated user"), 409: errorResponses[422], ...errorResponses },
    }),
    async (c) => {
      const admin = requirePermission(c, "user:manage");
      return c.json(await svc.updateUser(c.get("db"), admin, c.req.valid("param").id, c.req.valid("json")), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "put",
      path: "/users/{id}/specialties",
      tags,
      summary: "Set an officer's specialties (admin)",
      security: authed,
      request: { params: UserIdParam, body: jsonBody(z.object({ categoryIds: z.array(z.uuid()).max(20) })) },
      responses: { 200: json(UserSchema, "Updated user"), 409: errorResponses[422], ...errorResponses },
    }),
    async (c) => {
      const admin = requirePermission(c, "user:manage");
      return c.json(
        await svc.setSpecialties(c.get("db"), admin, c.req.valid("param").id, c.req.valid("json").categoryIds),
        200,
      );
    },
  );
}
