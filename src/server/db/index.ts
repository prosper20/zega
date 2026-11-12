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
const pool = globalForDb.zegaPool ?? new Pool({ connectionString: env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.zegaPool = pool;

export const db: Database = drizzle({ client: pool, schema, casing: "snake_case" });
export { schema };
