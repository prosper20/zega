// Demo data. Logins use the password Zega@2026!: admin@, officer@, staff@, student@zega.test
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { relaxConnectTimeout } from "../src/server/db/network";
import * as schema from "../src/server/db/schema";
import { seedDatabase } from "../src/server/db/seed";
import type { Database } from "../src/server/db/types";

relaxConnectTimeout();
if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: url });
const db = drizzle({ client: pool, schema, casing: "snake_case" }) as unknown as Database;
const started = Date.now();
try {
  const result = await seedDatabase(db, { log: (m) => console.log(`  ${m}`) });
  console.log(`Seeded in ${((Date.now() - started) / 1000).toFixed(1)}s`, result);
} finally {
  await pool.end();
}
