import { PGlite } from "@electric-sql/pglite";
import { ltree } from "@electric-sql/pglite/contrib/ltree";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "@/server/db/schema";
import type { Database } from "@/server/db/types";

import path from "node:path";

export async function createTestDb() {
  const client = new PGlite({ extensions: { ltree, pg_trgm } });
  const db = drizzle({ client, schema, casing: "snake_case" }) as unknown as Database;
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
  return { db, client, close: () => client.close() };
}
