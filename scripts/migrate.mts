/**
 * Applies drizzle/ migrations to Neon over WebSockets (port 443), so it works where
 * port 5432 is blocked and inside the Vercel build. Usage: npm run db:migrate
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

import { relaxConnectTimeout } from "../src/server/db/network";

relaxConnectTimeout();
if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: url });
const started = Date.now();
await migrate(drizzle({ client: pool, casing: "snake_case" }), { migrationsFolder: "drizzle" });
await pool.end();
console.log(`Migrations applied in ${Date.now() - started}ms`);
