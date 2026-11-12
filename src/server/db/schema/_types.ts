import { customType } from "drizzle-orm/pg-core";

/** Postgres `ltree` (hierarchical label path, e.g. main.hostel_b.floor_2). Requires the ltree extension. */
export const ltree = customType<{ data: string }>({
  dataType: () => "ltree",
});

/** Postgres `tsvector` for full-text search. */
export const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});
