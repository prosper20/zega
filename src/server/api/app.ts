import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";

import type { ApiDeps, AppEnv } from "./context";
import { OPENAPI_CONFIG, registerDocs, toPostman } from "./openapi";
import { handleError, problemResponse, zodErrors } from "./problem";
import { auditRoutes } from "./routes/audit";
import { catalogRoutes } from "./routes/catalog";
import { notificationRoutes } from "./routes/notifications";
import { realtimeRoutes } from "./routes/realtime";
import { reportRoutes } from "./routes/reports";
import { requestRoutes } from "./routes/requests";
import { systemRoutes } from "./routes/system";
import { userRoutes } from "./routes/users";

/**
 * Builds the ZEGA REST API. Dependencies (database, authenticator) are injected so the exact
 * same app runs on Neon in production and on in-process PGlite in tests.
 */
export function createApi(deps: ApiDeps) {
  const app = new OpenAPIHono<AppEnv>({
    // Turn request validation failures into RFC 9457 problems with per-field errors.
    defaultHook: (result, c) => {
      if (!result.success)
        return problemResponse(c, 422, "validation-failed", "Request validation failed.", zodErrors(result.error));
    },
  }).basePath("/api");

  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id")?.slice(0, 64) || `req_${crypto.randomUUID().slice(0, 8)}`;
    c.set("requestId", requestId);
    c.set("db", deps.db);
    c.set("storage", deps.storage);
    c.set("events", deps.events);
    c.set("user", await deps.authenticate(c.req.raw).catch(() => null));
    await next();
    c.header("X-Request-Id", requestId);
    if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "no-store");
  });

  systemRoutes(app);
  requestRoutes(app);
  catalogRoutes(app);
  userRoutes(app);
  notificationRoutes(app);
  reportRoutes(app);
  auditRoutes(app);
  realtimeRoutes(app);

  registerDocs(app);
  app.doc31("/openapi.json", OPENAPI_CONFIG);
  app.get("/postman.json", (c) => {
    const doc = app.getOpenAPI31Document(OPENAPI_CONFIG);
    const origin = new URL(c.req.url).origin;
    c.header("Content-Disposition", 'attachment; filename="zega.postman_collection.json"');
    return c.json(toPostman(doc as never, origin));
  });
  app.get(
    "/docs",
    Scalar({
      url: "/api/openapi.json",
      pageTitle: "ZEGA API reference",
      theme: "default",
      layout: "modern",
      defaultOpenAllTags: false,
      hideDownloadButton: false,
      showDeveloperTools: "never",
      showToolbar: "never",
      hideClientButton: true,
      metaData: { title: "ZEGA API reference" },
    } as never),
  );
  app.get("/docs/swagger", swaggerUI({ url: "/api/openapi.json", title: "ZEGA API (Swagger UI)" }));

  app.notFound((c) =>
    problemResponse(c, 404, "not-found", `No endpoint ${c.req.method} ${new URL(c.req.url).pathname}.`),
  );
  app.onError(handleError);
  return app;
}

export type ApiApp = ReturnType<typeof createApi>;
