import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

import type { AppEnv } from "./context";

/**
 * RFC 9457 "Problem Details for HTTP APIs". Every API error has the same machine-readable shape:
 * { type, title, status, detail, instance, requestId, errors? } with content type application/problem+json.
 */
export type ProblemBody = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
  errors?: { path: string; message: string }[];
};

const TITLES: Record<number, string> = {
  400: "Bad request",
  401: "Authentication required",
  403: "Forbidden",
  404: "Not found",
  409: "Conflict",
  422: "Validation failed",
  429: "Too many requests",
  500: "Internal server error",
};

export const PROBLEM_TYPE_BASE = "https://zega.app/problems/";

export class Problem extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly slug: string,
    detail?: string,
    readonly errors?: ProblemBody["errors"],
  ) {
    super(detail ?? TITLES[status] ?? "Error");
  }
}

export const problems = {
  unauthorized: () => new Problem(401, "unauthorized", "Sign in, or send a valid Bearer token."),
  forbidden: (detail = "You do not have permission to do this.") => new Problem(403, "forbidden", detail),
  notFound: (what = "Resource") => new Problem(404, "not-found", `${what} not found.`),
  conflict: (detail: string, slug = "conflict") => new Problem(409, slug, detail),
  invalid: (detail: string, errors?: ProblemBody["errors"]) => new Problem(422, "validation-failed", detail, errors),
  badRequest: (detail: string) => new Problem(400, "bad-request", detail),
};

export function problemResponse(
  c: Context<AppEnv>,
  status: ContentfulStatusCode,
  slug: string,
  detail?: string,
  errors?: ProblemBody["errors"],
) {
  const body: ProblemBody = {
    type: `${PROBLEM_TYPE_BASE}${slug}`,
    title: TITLES[status] ?? "Error",
    status,
    detail,
    instance: new URL(c.req.url).pathname,
    requestId: c.get("requestId"),
    ...(errors?.length ? { errors } : {}),
  };
  return c.body(JSON.stringify(body), status, { "Content-Type": "application/problem+json" });
}

export function zodErrors(error: ZodError) {
  return error.issues.map((i) => ({ path: i.path.join(".") || "(root)", message: i.message }));
}

/** Global error handler: converts anything thrown in a route into Problem Details. */
export function handleError(err: Error, c: Context<AppEnv>) {
  if (err instanceof Problem) return problemResponse(c, err.status, err.slug, err.message, err.errors);
  if (err instanceof ZodError)
    return problemResponse(c, 422, "validation-failed", "Request validation failed.", zodErrors(err));
  if (err instanceof HTTPException)
    return problemResponse(c, err.status as ContentfulStatusCode, "http-error", err.message);
  const pgCode = (err as { cause?: { code?: string } }).cause?.code;
  if (pgCode === "23505") return problemResponse(c, 409, "conflict", "That record already exists.");
  if (pgCode === "23503") return problemResponse(c, 422, "validation-failed", "A referenced record does not exist.");
  console.error(`[api] ${c.get("requestId")}`, err);
  return problemResponse(c, 500, "internal", "Something went wrong. Quote the request id if you report it.");
}
