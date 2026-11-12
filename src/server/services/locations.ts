import { sql } from "drizzle-orm";

import type { DbOrTx } from "@/server/db/types";
import { rowsOf } from "@/server/db/types";

export type LocationNode = {
  id: string;
  parentId: string | null;
  name: string;
  code: string;
  kind: string;
  path: string;
  qrToken: string;
};

export type LocationIndex = {
  all: LocationNode[];
  byId: Map<string, LocationNode>;
  /** "Moremi Hall › Floor 2 › Shower block" (campus root omitted). */
  label: (id: string) => string;
};

const TTL_MS = 60_000;
const cache = new WeakMap<object, { at: number; index: LocationIndex }>();

/** The location table is small (tens of rows), so it is indexed in memory and cached briefly. */
export async function getLocationIndex(db: DbOrTx, fresh = false): Promise<LocationIndex> {
  const hit = cache.get(db);
  if (!fresh && hit && Date.now() - hit.at < TTL_MS) return hit.index;
  const all = rowsOf<LocationNode>(
    await db.execute(
      sql`select id, parent_id as "parentId", name, code, kind::text as kind, path::text as path, qr_token as "qrToken" from locations order by path`,
    ),
  );
  const byId = new Map(all.map((l) => [l.id, l]));
  const label = (id: string) => {
    const parts: string[] = [];
    let cur = byId.get(id);
    while (cur) {
      if (cur.kind !== "campus") parts.unshift(cur.name);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return parts.join(" › ") || (byId.get(id)?.name ?? "Unknown location");
  };
  const index = { all, byId, label };
  cache.set(db, { at: Date.now(), index });
  return index;
}

export function invalidateLocations(db: DbOrTx) {
  cache.delete(db);
}
