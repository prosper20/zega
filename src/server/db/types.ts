import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";

import type * as schema from "./schema";

type Schema = typeof schema;

/** Driver-agnostic database type: Neon in the app, PGlite in tests. */
export type Database = PgDatabase<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
export type Tx = PgTransaction<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
export type DbOrTx = Database | Tx;

/** Rows from a raw `db.execute(sql...)` result. Neon and PGlite both return `{ rows }`. */
export function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}
