import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

import { STATUS_LABELS } from "@/domain/constants";
import { formatDuration } from "@/domain/sla";
import { summary, toCsv } from "@/server/services/reports";
import { listRequests } from "@/server/services/requests";

import type { AppEnv } from "../context";
import { authed, requirePermission, requireUser } from "../guard";
import { errorResponses, json } from "../schemas/common";
import { RequestListQuery } from "../schemas/requests";

const DAY = 86_400_000;
const RangeQuery = z.object({
  from: z.coerce.date().optional().openapi({ description: "Defaults to 30 days ago", example: "2026-10-13" }),
  to: z.coerce.date().optional().openapi({ description: "Defaults to now", example: "2026-11-12" }),
});

const SummarySchema = z
  .object({
    range: z.object({ from: z.string(), to: z.string() }),
    totals: z.object({
      total: z.number(),
      open: z.number(),
      resolved: z.number(),
      closed: z.number(),
      rejected: z.number(),
      cancelled: z.number(),
      breachedOpen: z.number(),
      avgResolutionHours: z.number().nullable(),
      avgResponseHours: z.number().nullable(),
      slaCompliance: z
        .number()
        .nullable()
        .openapi({ description: "Percentage of judged requests resolved within target" }),
      avgRating: z.number().nullable(),
      ratings: z.number(),
    }),
    byStatus: z.array(z.object({ status: z.string(), count: z.number() })),
    byCategory: z.array(
      z.object({
        category: z.string(),
        slug: z.string(),
        count: z.number(),
        open: z.number(),
        avgResolutionHours: z.number().nullable(),
      }),
    ),
    daily: z.array(z.object({ day: z.string(), created: z.number(), resolved: z.number() })),
    officers: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        open: z.number(),
        resolved: z.number(),
        avgRating: z.number().nullable(),
      }),
    ),
    hotspots: z.array(z.object({ id: z.string(), name: z.string(), count: z.number() })),
  })
  .openapi("ReportSummary");

export function reportRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/reports/summary",
      tags: ["Reports"],
      summary: "Operational summary (admin)",
      description:
        "Volumes, SLA compliance, resolution times, satisfaction, officer workload and hotspots for a date range.",
      security: authed,
      request: { query: RangeQuery },
      responses: { 200: json(SummarySchema, "Summary"), ...errorResponses },
    }),
    async (c) => {
      requirePermission(c, "report:view");
      const q = c.req.valid("query");
      const to = q.to ? new Date(q.to.getTime() + DAY - 1) : new Date();
      const from = q.from ?? new Date(to.getTime() - 30 * DAY);
      return c.json(await summary(c.get("db"), { from, to }), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/exports/requests.csv",
      tags: ["Reports"],
      summary: "Export requests as CSV",
      description:
        "Accepts the same filters as `GET /requests` and exports every matching request the caller can see (up to 5,000 rows). Opens cleanly in Excel.",
      security: authed,
      request: { query: RequestListQuery.omit({ cursor: true, limit: true }) },
      responses: {
        200: { description: "CSV file", content: { "text/csv": { schema: z.string() } } },
        ...errorResponses,
      },
    }),
    async (c) => {
      const user = requireUser(c);
      const db = c.get("db");
      const rows: Awaited<ReturnType<typeof listRequests>>["data"] = [];
      let cursor: string | undefined;
      do {
        const page = await listRequests(db, user, { ...c.req.valid("query"), limit: 100, cursor });
        rows.push(...page.data);
        cursor = page.pageInfo.nextCursor ?? undefined;
      } while (cursor && rows.length < 5000);

      const csv = toCsv(
        [
          "Reference",
          "Title",
          "Status",
          "Priority",
          "Category",
          "Location",
          "Requester",
          "Assignee",
          "Created",
          "Resolution due",
          "Resolved",
          "Time to resolve",
          "SLA",
          "Me too votes",
        ],
        rows.map((r) => [
          r.refCode,
          r.title,
          STATUS_LABELS[r.status],
          r.priority,
          r.category.name,
          r.location.label,
          r.requester.name,
          r.assignee?.name ?? "",
          r.createdAt,
          r.resolutionDueAt ?? "",
          r.resolvedAt ?? "",
          r.resolvedAt ? formatDuration(Date.parse(r.resolvedAt) - Date.parse(r.createdAt)) : "",
          r.sla.resolution.replace("_", " "),
          r.voteCount,
        ]),
      );
      const stamp = new Date().toISOString().slice(0, 10);
      return c.body(csv, 200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="zega-requests-${stamp}.csv"`,
      });
    },
  );
}
