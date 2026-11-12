import { sql } from "drizzle-orm";
import { type AnyPgColumn, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { ltree } from "./_types";
import { locationKind } from "./enums";

/**
 * Self-referencing location tree (campus > building/hostel > floor > room).
 * `path` is an ltree maintained by a trigger, so "everything inside Hostel B" is a single
 * indexed `path <@ 'main.hostel_b'` query. `qrToken` is printed on room stickers.
 */
export const locations = pgTable(
  "locations",
  {
    id: uuid().primaryKey().defaultRandom(),
    parentId: uuid().references((): AnyPgColumn => locations.id, { onDelete: "restrict" }),
    name: text().notNull(),
    code: text().notNull().unique(),
    kind: locationKind().notNull(),
    path: ltree().notNull().default(sql`''::ltree`),
    qrToken: text().notNull().unique().default(sql`substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)`),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("locations_path_gist").using("gist", t.path), index("locations_parent_idx").on(t.parentId)],
);
