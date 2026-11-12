import { PGlite } from "@electric-sql/pglite";
import { ltree } from "@electric-sql/pglite/contrib/ltree";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "@/server/db/schema";
import type { Database } from "@/server/db/types";

import path from "node:path";

/**
 * Fresh in-process Postgres (PGlite, WASM) with the real migrations applied.
 * No Docker and no network: each test file gets an isolated database in milliseconds.
 */
export async function createTestDb() {
  const client = new PGlite({ extensions: { ltree, pg_trgm } });
  const db = drizzle({ client, schema, casing: "snake_case" }) as unknown as Database;
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
  return { db, client, close: () => client.close() };
}
