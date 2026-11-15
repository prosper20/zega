import { hc } from "hono/client";

import type { ApiApp } from "@/server/api/app";

export const api = hc<ApiApp>(
  typeof window === "undefined" ? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") : window.location.origin,
  {
    init: { credentials: "include" },
  },
);

export type Problem = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: { path: string; message: string }[];
};

/** Throws a typed error carrying the RFC 9457 problem body when the response is not OK. */
export class ApiError extends Error {
  constructor(readonly problem: Problem) {
    super(problem.detail ?? problem.title);
  }
}

export async function unwrap<T>(res: Response | Promise<Response>): Promise<T> {
  const r = await res;
  if (r.ok) return (await r.json()) as T;
  let problem: Problem;
  try {
    problem = (await r.json()) as Problem;
  } catch {
    problem = { type: "about:blank", title: r.statusText || "Request failed", status: r.status };
  }
  throw new ApiError(problem);
}
