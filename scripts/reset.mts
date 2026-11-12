/**
 * DESTRUCTIVE: drops every table in DATABASE_URL, then you can re-run db:migrate and db:seed.
 * The audit log blocks DELETE/TRUNCATE by design, so a full reset drops the schema instead.
 * Usage: npm run db:reset -- --yes
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

import { relaxConnectTimeout } from "../src/server/db/network";

if (!process.argv.includes("--yes")) {
  console.error("Refusing to reset without --yes. This deletes ALL data in DATABASE_URL.");
  process.exit(1);
}

relaxConnectTimeout();
if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url });
await pool.query("drop schema if exists drizzle cascade");
await pool.query("drop schema public cascade");
await pool.query("create schema public");
await pool.end();
console.log("Database reset. Run: npm run db:migrate && npm run db:seed");
