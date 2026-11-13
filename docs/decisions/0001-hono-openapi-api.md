# 0001. REST API with Hono and Zod-generated OpenAPI

Date: 2026-11-12 · Status: Accepted

## Context

The brief asks for a REST API with CRUD, validation, error handling and documentation (Swagger or
Postman). Next.js server actions would be quicker to write but are not a REST API, cannot be called
from Postman, and have no contract. A hand-written OpenAPI file drifts from the code.

## Decision

Mount a Hono app at `/api` through a catch-all route (`src/app/api/[[...route]]/route.ts`). Declare
every route with `@hono/zod-openapi`: the same Zod schema validates the request and generates the
OpenAPI 3.1 document. Serve Scalar at `/api/docs`, Swagger UI at `/api/docs/swagger`, the raw spec at
`/api/openapi.json`, and a Postman collection converted from it at `/api/postman.json`. Errors use
RFC 9457 Problem Details (`application/problem+json`) with a per-field `errors` list for `422`.

## Consequences

- The documentation cannot drift: changing a schema changes validation and docs together.
- The API is testable in-process with `app.request()`, without starting a server.
- Dependencies are injected into `createApi()`, which keeps tests fast (see ADR 0005).
- Two routing systems exist side by side (Next for pages, Hono for the API); the boundary is clear
  (`/api/*`).
