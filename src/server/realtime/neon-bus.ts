import "server-only";

import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { relaxConnectTimeout } from "@/server/db/network";
import { log } from "@/server/log";

import { createFanout, type EventBus, parseEvent } from "./events";

relaxConnectTimeout();
if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;

/**
 * One shared Postgres LISTEN connection per server instance, fanned out to every open SSE stream.
 * Uses the direct (unpooled) endpoint because PgBouncer transaction pooling cannot hold LISTEN.
 * Reconnects with backoff if the connection drops.
 */
function createNeonBus(): EventBus {
  const fanout = createFanout();
  let client: Client | null = null;
  let connecting: Promise<void> | null = null;
  let retry = 1000;

  const connect = () => {
    if (client || connecting) return connecting;
    connecting = (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL });
      c.on("notification", (msg) => {
        const e = parseEvent(msg.payload);
        if (e) fanout.emit(e);
      });
      c.on("error", (err) => {
        log.warn("events.connection_lost", { err, retryInMs: retry });
        client = null;
        void c.end().catch(() => undefined);
        setTimeout(() => void connect(), retry);
        retry = Math.min(retry * 2, 30_000);
      });
      await c.connect();
      await c.query("LISTEN zega_events");
      client = c;
      retry = 1000;
    })()
      .catch((err) => {
        log.error("events.listen_failed", { err, retryInMs: retry });
        setTimeout(() => void connect(), retry);
        retry = Math.min(retry * 2, 30_000);
      })
      .finally(() => {
        connecting = null;
      });
    return connecting;
  };

  return {
    subscribe: (listener) => {
      void connect();
      return fanout.subscribe(listener);
    },
  };
}

const g = globalThis as unknown as { zegaBus?: EventBus };
export const neonBus: EventBus = g.zegaBus ?? createNeonBus();
if (process.env.NODE_ENV !== "production") g.zegaBus = neonBus;
