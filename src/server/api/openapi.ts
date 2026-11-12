import type { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";

import type { AppEnv } from "./context";
import { errorResponses, json, jsonBody } from "./schemas/common";

export const OPENAPI_CONFIG = {
  openapi: "3.1.0",
  info: {
    title: "ZEGA API",
    version: "1.0.0",
    description: [
      "REST API for **ZEGA**, the university services and maintenance request platform. *Report it. Track it. Resolve it.*",
      "",
      "**Authentication.** Sign in with `POST /api/auth/sign-in/email`; the session cookie is then sent automatically. API clients can instead call `GET /api/auth/token` and send `Authorization: Bearer <jwt>` (EdDSA-signed, 15 minutes, keys at `/api/auth/jwks`).",
      "",
      "**Errors** use RFC 9457 Problem Details (`application/problem+json`): `401` not signed in, `403` not allowed, `404` not found or not visible to you, `409` conflicts such as invalid status changes, `422` validation errors with a per-field `errors` list. Every response carries an `X-Request-Id` header.",
      "",
      "**Pagination** on `/requests` is keyset-based: pass `pageInfo.nextCursor` back as `cursor`.",
      "",
      "Demo accounts (password `Zega@2026!`): `student@zega.test`, `staff@zega.test`, `officer@zega.test`, `admin@zega.test`.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "This deployment" }],
  tags: [
    { name: "Auth", description: "Sign up, sign in, sessions and tokens (Better Auth)" },
    { name: "Requests", description: "Service requests and their lifecycle" },
    { name: "Catalog", description: "Categories, SLA targets and campus locations" },
    { name: "Users", description: "User and role management (admin)" },
    { name: "Notifications", description: "In-app notifications" },
    { name: "Reports", description: "Dashboards and exports" },
    { name: "Audit", description: "Tamper-evident audit trail" },
    { name: "System", description: "Health and identity" },
  ],
};

/** Registers security schemes and documents the Better Auth endpoints mounted at /api/auth. */
export function registerDocs(app: OpenAPIHono<AppEnv>) {
  app.openAPIRegistry.registerComponent("securitySchemes", "cookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
    description: "Session cookie set by POST /auth/sign-in/email",
  });
  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Short-lived JWT from GET /auth/token",
  });

  const SessionUser = z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
      department: z.string().nullable(),
      matricOrStaffNo: z.string().nullable(),
    })
    .openapi("SessionUser");
  const tags = ["Auth"];
  const register = (method: "get" | "post", path: string, summary: string, extra: Record<string, unknown>) =>
    app.openAPIRegistry.registerPath({ method, path, tags, summary, ...extra } as never);

  register("post", "/auth/sign-up/email", "Register (students and staff)", {
    description:
      "Creates an account and signs in. Matric numbers look like `ZU/2023/01027`, staff IDs like `STF/0412`.",
    request: {
      body: jsonBody(
        z.object({
          name: z.string().openapi({ example: "Tobi Adewale" }),
          email: z.string().openapi({ example: "tobi@example.com" }),
          password: z.string().openapi({ example: "Passw0rd!" }),
          accountType: z.enum(["student", "staff"]),
          matricOrStaffNo: z.string().openapi({ example: "ZU/2025/01234" }),
          department: z.string().openapi({ example: "Computer Science" }),
          phone: z.string().optional(),
        }),
      ),
    },
    responses: {
      200: json(z.object({ token: z.string(), user: SessionUser }), "Signed up and signed in"),
      400: errorResponses[422],
      429: errorResponses[422],
    },
  });
  register("post", "/auth/sign-in/email", "Sign in", {
    request: {
      body: jsonBody(
        z.object({
          email: z.string().openapi({ example: "admin@zega.test" }),
          password: z.string().openapi({ example: "Zega@2026!" }),
          rememberMe: z.boolean().optional(),
        }),
      ),
    },
    responses: {
      200: json(z.object({ token: z.string(), user: SessionUser }), "Signed in; sets the session cookie"),
      401: errorResponses[401],
      429: errorResponses[422],
    },
  });
  register("post", "/auth/sign-out", "Sign out", {
    responses: { 200: json(z.object({ success: z.boolean() }), "Signed out") },
  });
  register("get", "/auth/get-session", "Current session", {
    security: [{ cookieAuth: [] }],
    responses: {
      200: json(
        z.object({ session: z.record(z.string(), z.unknown()), user: SessionUser }).nullable(),
        "Session or null",
      ),
    },
  });
  register("get", "/auth/list-sessions", "Your active sessions", {
    security: [{ cookieAuth: [] }],
    responses: { 200: json(z.array(z.record(z.string(), z.unknown())), "Sessions") },
  });
  register("post", "/auth/revoke-session", "Sign out one device", {
    security: [{ cookieAuth: [] }],
    request: { body: jsonBody(z.object({ token: z.string() })) },
    responses: { 200: json(z.object({ status: z.boolean() }), "Revoked") },
  });
  register("get", "/auth/token", "Get a JWT for API calls", {
    security: [{ cookieAuth: [] }],
    responses: { 200: json(z.object({ token: z.string() }), "A 15-minute EdDSA JWT") },
  });
  register("get", "/auth/jwks", "Public signing keys (JWKS)", {
    responses: { 200: json(z.object({ keys: z.array(z.record(z.string(), z.unknown())) }), "JWK set") },
  });
}

/* ------------------------------------------------------------------ Postman */

type OpenApiDoc = {
  info: { title: string; description?: string };
  paths: Record<
    string,
    Record<
      string,
      {
        summary?: string;
        description?: string;
        tags?: string[];
        parameters?: {
          name: string;
          in: string;
          example?: unknown;
          required?: boolean;
          schema?: { example?: unknown };
        }[];
        requestBody?: { content?: Record<string, { schema?: unknown }> };
      }
    >
  >;
  components?: { schemas?: Record<string, unknown> };
};

/** Builds an example JSON value from a schema (examples first, then types), resolving $refs. */
function exampleFor(schema: unknown, doc: OpenApiDoc, depth = 0): unknown {
  if (!schema || typeof schema !== "object" || depth > 6) return null;
  const sch = schema as Record<string, unknown>;
  if (typeof sch.$ref === "string")
    return exampleFor(doc.components?.schemas?.[sch.$ref.split("/").pop() as string], doc, depth + 1);
  if (sch.example !== undefined) return sch.example;
  if (sch.default !== undefined) return sch.default;
  if (Array.isArray(sch.enum)) return sch.enum[0];
  for (const key of ["oneOf", "anyOf", "allOf"])
    if (Array.isArray(sch[key])) return exampleFor((sch[key] as unknown[])[0], doc, depth + 1);
  if (sch.type === "object" || sch.properties) {
    const props = (sch.properties ?? {}) as Record<string, unknown>;
    const required = new Set((sch.required as string[]) ?? []);
    return Object.fromEntries(
      Object.entries(props)
        .filter(([k]) => required.has(k) || depth === 0)
        .map(([k, v]) => [k, exampleFor(v, doc, depth + 1)]),
    );
  }
  if (sch.type === "array") return [exampleFor(sch.items, doc, depth + 1)];
  if (sch.type === "integer" || sch.type === "number") return 1;
  if (sch.type === "boolean") return true;
  if (sch.format === "uuid") return "00000000-0000-4000-8000-000000000000";
  return "string";
}

/**
 * Converts the OpenAPI document into a Postman v2.1 collection (grouped by tag, with example bodies),
 * so the API can be imported into Postman without extra tooling.
 */
export function toPostman(doc: OpenApiDoc, baseUrl: string) {
  const folders = new Map<string, unknown[]>();
  for (const [path, ops] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      const segments = path
        .replace(/^\//, "")
        .split("/")
        .map((s) => s.replace(/^\{(.+)\}$/, ":$1"));
      const query = (op.parameters ?? [])
        .filter((p) => p.in === "query")
        .map((p) => ({ key: p.name, value: String(p.example ?? p.schema?.example ?? ""), disabled: !p.required }));
      const variable = (op.parameters ?? [])
        .filter((p) => p.in === "path")
        .map((p) => ({ key: p.name, value: String(p.example ?? p.schema?.example ?? "") }));
      const bodySchema = op.requestBody?.content?.["application/json"]?.schema;
      const item = {
        name: op.summary ?? `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: bodySchema ? [{ key: "Content-Type", value: "application/json" }] : [],
          description: op.description,
          url: { raw: `{{baseUrl}}/${segments.join("/")}`, host: ["{{baseUrl}}"], path: segments, query, variable },
          ...(bodySchema
            ? {
                body: {
                  mode: "raw",
                  raw: JSON.stringify(exampleFor(bodySchema, doc), null, 2),
                  options: { raw: { language: "json" } },
                },
              }
            : {}),
        },
      };
      const tag = op.tags?.[0] ?? "Other";
      folders.set(tag, [...(folders.get(tag) ?? []), item]);
    }
  }
  return {
    info: {
      name: doc.info.title,
      description: `${doc.info.description ?? ""}\n\nRun "Sign in" in the Auth folder first: Postman keeps the session cookie for the other requests.`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [{ key: "baseUrl", value: baseUrl }],
    item: [...folders.entries()].map(([name, item]) => ({ name, item })),
  };
}
