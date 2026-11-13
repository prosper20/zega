import { sql } from "drizzle-orm";

import { OPEN_STATUSES } from "@/domain/constants";
import { type Database, rowsOf } from "@/server/db/types";

import { getLocationIndex } from "./locations";

const OPEN = sql.raw(`(${OPEN_STATUSES.map((x) => `'${x}'`).join(",")})`);

/** Operational KPIs for the admin dashboard and the PDF report, over a date range. */
export async function summary(db: Database, range: { from: Date; to: Date }) {
  const { from, to } = range;
  const inRange = sql`r.deleted_at is null and r.created_at between ${from} and ${to}`;

  type Totals = {
    total: number;
    open: number;
    resolved: number;
    closed: number;
    rejected: number;
    cancelled: number;
    avg_resolution_hours: number | null;
    avg_response_hours: number | null;
    sla_met: number;
    sla_judged: number;
    breached_open: number;
  };

  // Independent aggregates run in parallel: one round trip of latency instead of seven.
  const [totalsRes, ratingRes, byStatusRes, byCategoryRes, dailyRes, officersRes, hotspotsRes] = await Promise.all([
    db.execute(sql`
      select count(*)::int as total,
             count(*) filter (where r.status in ${OPEN})::int as open,
             count(*) filter (where r.status = 'resolved')::int as resolved,
             count(*) filter (where r.status = 'closed')::int as closed,
             count(*) filter (where r.status = 'rejected')::int as rejected,
             count(*) filter (where r.status = 'cancelled')::int as cancelled,
             round(avg(extract(epoch from r.resolved_at - r.created_at) / 3600) filter (where r.resolved_at is not null)::numeric, 1)::float as avg_resolution_hours,
             round(avg(extract(epoch from r.first_response_at - r.created_at) / 3600) filter (where r.first_response_at is not null)::numeric, 1)::float as avg_response_hours,
             count(*) filter (where r.resolved_at is not null and r.resolved_at <= r.resolution_due_at)::int as sla_met,
             count(*) filter (where r.resolved_at is not null or (r.status in ${OPEN} and now() > r.resolution_due_at))::int as sla_judged,
             count(*) filter (where r.status in ${OPEN} and now() > r.resolution_due_at)::int as breached_open
      from service_requests r where ${inRange}`),
    db.execute(sql`
      select round(avg(t.score)::numeric, 2)::float as avg, count(*)::int as count
      from ratings t join service_requests r on r.id = t.request_id where ${inRange}`),
    db.execute(
      sql`select r.status::text as status, count(*)::int as count from service_requests r where ${inRange} group by 1 order by 2 desc`,
    ),
    db.execute(sql`
      select c.name as category, c.slug, count(*)::int as count,
             count(*) filter (where r.status in ${OPEN})::int as open,
             round(avg(extract(epoch from r.resolved_at - r.created_at) / 3600) filter (where r.resolved_at is not null)::numeric, 1)::float as avg_resolution_hours
      from service_requests r join request_categories c on c.id = r.category_id
      where ${inRange} group by 1, 2 order by 3 desc`),
    db.execute(sql`
      with days as (select generate_series(date_trunc('day', ${from}::timestamptz), date_trunc('day', ${to}::timestamptz), interval '1 day') as day)
      select to_char(d.day, 'YYYY-MM-DD') as day,
             (select count(*)::int from service_requests r where r.deleted_at is null and date_trunc('day', r.created_at) = d.day) as created,
             (select count(*)::int from service_requests r where r.deleted_at is null and date_trunc('day', r.resolved_at) = d.day) as resolved
      from days d order by d.day`),
    db.execute(sql`
      select u.id, u.name,
             (select count(*)::int from service_requests r where r.current_assignee_id = u.id and r.status in ${OPEN} and r.deleted_at is null) as open,
             (select count(*)::int from service_requests r where r.current_assignee_id = u.id and r.resolved_at between ${from} and ${to}) as resolved,
             (select round(avg(t.score)::numeric, 2)::float from ratings t join service_requests r on r.id = t.request_id where r.current_assignee_id = u.id) as avg_rating
      from users u where u.role = 'officer' order by open desc, name`),
    db.execute(
      sql`select r.location_id, count(*)::int as count from service_requests r where ${inRange} group by 1 order by 2 desc limit 50`,
    ),
  ]);
  const [totals] = rowsOf<Totals>(totalsRes);
  const [rating] = rowsOf<{ avg: number | null; count: number }>(ratingRes);
  const byStatus = rowsOf<{ status: string; count: number }>(byStatusRes);
  const byCategory = rowsOf<{
    category: string;
    slug: string;
    count: number;
    open: number;
    avg_resolution_hours: number | null;
  }>(byCategoryRes);
  const daily = rowsOf<{ day: string; created: number; resolved: number }>(dailyRes);
  const officers = rowsOf<{ id: string; name: string; open: number; resolved: number; avg_rating: number | null }>(
    officersRes,
  );
  const hotspots = rowsOf<{ location_id: string; count: number }>(hotspotsRes);

  // Roll room-level counts up to their building or hostel (second level of the ltree path).
  const loc = await getLocationIndex(db);
  const buildingOf = (id: string) => {
    let cur = loc.byId.get(id);
    while (cur?.parentId && loc.byId.get(cur.parentId)?.kind !== "campus") cur = loc.byId.get(cur.parentId);
    return cur;
  };
  const buildings = new Map<string, { id: string; name: string; count: number }>();
  for (const h of hotspots) {
    const b = buildingOf(h.location_id);
    if (!b) continue;
    const entry = buildings.get(b.id) ?? { id: b.id, name: b.name, count: 0 };
    entry.count += Number(h.count);
    buildings.set(b.id, entry);
  }

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      total: totals.total,
      open: totals.open,
      resolved: totals.resolved,
      closed: totals.closed,
      rejected: totals.rejected,
      cancelled: totals.cancelled,
      breachedOpen: totals.breached_open,
      avgResolutionHours: totals.avg_resolution_hours,
      avgResponseHours: totals.avg_response_hours,
      slaCompliance: totals.sla_judged ? Math.round((totals.sla_met / totals.sla_judged) * 1000) / 10 : null,
      avgRating: rating.avg,
      ratings: rating.count,
    },
    byStatus,
    byCategory: byCategory.map((c) => ({
      category: c.category,
      slug: c.slug,
      count: c.count,
      open: c.open,
      avgResolutionHours: c.avg_resolution_hours,
    })),
    daily,
    officers: officers.map((o) => ({
      id: o.id,
      name: o.name,
      open: o.open,
      resolved: o.resolved,
      avgRating: o.avg_rating,
    })),
    hotspots: [...buildings.values()].sort((a, b) => b.count - a.count).slice(0, 8),
  };
}

const csvCell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const str = String(v);
  // Neutralise spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

export function toCsv(header: string[], rows: unknown[][]) {
  return `﻿${[header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

/** Workload snapshot for one maintenance officer (their dashboard). */
export async function officerSummary(db: Database, officerId: string) {
  const [r] = rowsOf<{
    open: number;
    in_progress: number;
    overdue: number;
    due_soon: number;
    resolved_week: number;
    avg_rating: number | null;
    avg_hours: number | null;
  }>(
    await db.execute(sql`
      select
        count(*) filter (where r.status in ${OPEN})::int as open,
        count(*) filter (where r.status = 'in_progress')::int as in_progress,
        count(*) filter (where r.status in ${OPEN} and now() > r.resolution_due_at)::int as overdue,
        count(*) filter (where r.status in ${OPEN} and r.resolution_due_at between now() and now() + interval '24 hours')::int as due_soon,
        count(*) filter (where r.resolved_at > now() - interval '7 days')::int as resolved_week,
        (select round(avg(t.score)::numeric, 2)::float from ratings t join service_requests x on x.id = t.request_id where x.current_assignee_id = ${officerId}) as avg_rating,
        round(avg(extract(epoch from r.resolved_at - r.created_at) / 3600) filter (where r.resolved_at is not null)::numeric, 1)::float as avg_hours
      from service_requests r
      where r.current_assignee_id = ${officerId} and r.deleted_at is null`),
  );
  return {
    open: r.open,
    inProgress: r.in_progress,
    overdue: r.overdue,
    dueSoon: r.due_soon,
    resolvedThisWeek: r.resolved_week,
    avgRating: r.avg_rating,
    avgResolutionHours: r.avg_hours,
  };
}
