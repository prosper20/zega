// Fires concurrent audited writes and verifies the hash chain. Usage: npx tsx scripts/audit-race-check.mts <ref> [writers]
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

import { relaxConnectTimeout } from "../src/server/db/network";

relaxConnectTimeout();
if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;

const [ref, writersArg] = process.argv.slice(2);
const writers = Number(writersArg ?? 30);
if (!ref) throw new Error("Pass a request reference code, e.g. ZG-26-000169");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  max: writers,
});
const { rows: req } = await pool.query("select id, requester_id from service_requests where ref_code = $1", [ref]);
if (!req.length) throw new Error(`No request ${ref}`);
const { rows: start } = await pool.query("select coalesce(max(id), 0) as id from audit_logs");
const startId = Number(start[0].id);

await Promise.all(
  Array.from({ length: writers }, async (_, i) => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.user_id', $1, true)", [req[0].requester_id]);
      await client.query("insert into comments (request_id, author_id, body) values ($1, $2, $3)", [
        req[0].id,
        req[0].requester_id,
        `race check ${i}`,
      ]);
      await client.query("commit");
    } finally {
      client.release();
    }
  }),
);

const { rows } = await pool.query(
  `with seg as (select * from audit_logs where id >= $1 order by id)
   select s.id, s.prev_hash, s.hash,
          lag(s.hash) over (order by s.id) as expected_prev,
          encode(sha256(convert_to(coalesce(s.prev_hash, 'GENESIS') || '|' ||
            zega_audit_digest(s.id, s.table_name, s.row_id, s.action, s.actor_id, s.diff, s.created_at), 'UTF8')), 'hex') as recomputed
   from seg s`,
  [startId],
);
const linked = rows.slice(1);
const brokenLinks = linked.filter((r) => r.prev_hash !== r.expected_prev).map((r) => r.id);
const badHashes = rows.filter((r) => r.hash !== r.recomputed).map((r) => r.id);
console.log(`${writers} concurrent writers produced ${rows.length - 1} new audit rows after #${startId}.`);
console.log(
  brokenLinks.length || badHashes.length
    ? `BROKEN links: ${brokenLinks.join(", ")} bad hashes: ${badHashes.join(", ")}`
    : "Chain intact across the concurrent segment.",
);
await pool.end();
process.exit(brokenLinks.length || badHashes.length ? 1 : 0);
