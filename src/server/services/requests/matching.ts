/** Matching: duplicate detection while reporting and officer suggestions for assignment. */
import { sql } from "drizzle-orm";

import { OPEN_STATUSES, type RequestStatus } from "@/domain/constants";
import { can } from "@/domain/permissions";
import { problems } from "@/server/api/problem";
import { type Database, rowsOf } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";

import { getLocationIndex } from "../locations";
import { loadVisible } from "./shared";

/** Open requests that look like the one being typed: same building (ltree) or similar title (pg_trgm). */
export async function findSimilar(
  db: Database,
  user: CurrentUser,
  input: { title: string; locationId?: string; categoryId?: string },
) {
  const sameArea = input.locationId
    ? sql`l.path <@ (select subpath(path, 0, least(nlevel(path), 2)) from locations where id = ${input.locationId})`
    : sql`true`;
  const rows = rowsOf<{
    id: string;
    ref_code: string;
    title: string;
    status: RequestStatus;
    location_id: string;
    created_at: Date | string;
    requester_id: string;
    votes: number;
    voted: boolean;
    sim: number;
  }>(
    await db.execute(sql`
      select r.id, r.ref_code, r.title, r.status, r.location_id, r.created_at, r.requester_id,
             (select count(*)::int from request_votes v where v.request_id = r.id) as votes,
             exists (select 1 from request_votes v where v.request_id = r.id and v.user_id = ${user.id}) as voted,
             similarity(r.title, ${input.title}) as sim
      from service_requests r
      join locations l on l.id = r.location_id
      where r.deleted_at is null
        and r.status in ${sql.raw(`(${OPEN_STATUSES.map((x) => `'${x}'`).join(",")})`)}
        and ${sameArea}
        and (similarity(r.title, ${input.title}) > 0.2
             ${input.categoryId && input.locationId ? sql`or (r.category_id = ${input.categoryId} and r.location_id = ${input.locationId})` : sql``})
      order by (r.location_id = ${input.locationId ?? null}) desc nulls last, sim desc
      limit 5`),
  );
  const loc = await getLocationIndex(db);
  return rows.map((r) => ({
    id: r.id,
    refCode: r.ref_code,
    title: r.title,
    status: r.status,
    location: loc.label(r.location_id),
    voteCount: Number(r.votes),
    hasVoted: Boolean(r.voted),
    mine: r.requester_id === user.id,
    similarity: Math.round(Number(r.sim) * 100) / 100,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

/** Ranks officers for a request: category specialists first, then by current open workload. */
export async function suggestOfficers(db: Database, user: CurrentUser, idOrRef: string) {
  if (!can(user.role, "request:assign")) throw problems.forbidden();
  const row = await loadVisible(db, user, idOrRef);
  const rows = rowsOf<{
    id: string;
    name: string;
    specialties: string[] | null;
    specialist: boolean;
    open_jobs: number;
  }>(
    await db.execute(sql`
      select u.id, u.name,
             array_remove(array_agg(distinct c.name), null) as specialties,
             bool_or(os.category_id = ${row.category.id}) as specialist,
             (select count(*)::int from service_requests r
               where r.current_assignee_id = u.id and r.deleted_at is null
                 and r.status in ${sql.raw(`(${OPEN_STATUSES.map((x) => `'${x}'`).join(",")})`)}) as open_jobs
      from users u
      left join officer_specialties os on os.officer_id = u.id
      left join request_categories c on c.id = os.category_id
      where u.role = 'officer' and coalesce(u.banned, false) = false
      group by u.id, u.name`),
  );
  const maxLoad = Math.max(1, ...rows.map((r) => Number(r.open_jobs)));
  return rows
    .map((r) => {
      const load = Number(r.open_jobs);
      const score = Math.round((r.specialist ? 60 : 0) + 40 * (1 - load / (maxLoad + 1)));
      return {
        officer: { id: r.id, name: r.name, role: "officer" as const },
        specialties: r.specialties ?? [],
        specialist: Boolean(r.specialist),
        openJobs: load,
        score,
      };
    })
    .filter((o) => o.officer.id !== row.currentAssigneeId)
    .sort((a, b) => b.score - a.score || a.openJobs - b.openJobs);
}
