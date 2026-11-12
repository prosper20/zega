import "server-only";

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { env } from "@/env";

import { relaxConnectTimeout } from "./network";
import * as schema from "./schema";
import type { Database } from "./types";

relaxConnectTimeout();

// Node < 22 has no global WebSocket; Vercel's Node 22 runtime does.
if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;

const globalForDb = globalThis as unknown as { zegaPool?: Pool };

/** Pooled connection (WebSocket) so interactive transactions work for audit actor tracking. */
const isProd = process.env.NODE_ENV === "production";

/**
 * Locally (far from the database region) new connections are slow, so keep a few warm for minutes.
 * In production, functions sit next to Neon and idle connections are released quickly.
 */
const pool =
  globalForDb.zegaPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: isProd ? 10 : 4,
    idleTimeoutMillis: isProd ? 10_000 : 5 * 60_000,
  });
if (process.env.NODE_ENV !== "production") globalForDb.zegaPool = pool;

export const db: Database = drizzle({ client: pool, schema, casing: "snake_case" });
export { schema };
