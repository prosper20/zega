import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";

import { canReceive, type ZegaEvent } from "@/server/realtime/events";
import { runMaintenance } from "@/server/services/maintenance";

import type { AppEnv } from "../context";
import { authed, requireUser } from "../guard";
import { problems } from "../problem";
import { errorResponses, json } from "../schemas/common";

/** Streams are recycled before serverless time limits; EventSource reconnects automatically. */
const STREAM_LIFETIME_MS = 270_000;
const HEARTBEAT_MS = 25_000;

export function realtimeRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/events",
      tags: ["System"],
      summary: "Live updates (Server-Sent Events)",
      description:
        "Long-lived `text/event-stream`. Emits `request` events when a request you are involved in changes status, and `notification` events for your new notifications. Backed by Postgres LISTEN/NOTIFY; streams are recycled every few minutes and browsers reconnect automatically.",
      security: authed,
      responses: {
        200: { description: "Event stream", content: { "text/event-stream": { schema: z.string() } } },
        ...errorResponses,
      },
    }),
    (c) => {
      const user = requireUser(c);
      const bus = c.get("events");
      const db = c.get("db");
      // Opportunistic background sweep (SLA escalation, auto-close): runs at most every 5 minutes.
      void runMaintenance(db).catch((e) => console.error("[maintenance]", e));

      c.header("Cache-Control", "no-cache, no-transform");
      c.header("X-Accel-Buffering", "no");
      return streamSSE(c, async (stream) => {
        const queue: ZegaEvent[] = [];
        let wake: (() => void) | null = null;
        const unsubscribe = bus.subscribe((e) => {
          if (!canReceive(user, e)) return;
          queue.push(e);
          wake?.();
        });
        stream.onAbort(() => {
          unsubscribe();
          wake?.();
        });
        await stream.writeSSE({
          event: "ready",
          data: JSON.stringify({ userId: user.id, at: new Date().toISOString() }),
          retry: 3000,
        });

        const started = Date.now();
        let lastBeat = Date.now();
        let seq = 0;
        while (!stream.aborted && Date.now() - started < STREAM_LIFETIME_MS) {
          if (!queue.length) {
            await Promise.race([
              new Promise<void>((r) => (wake = r)),
              stream.sleep(Math.max(1000, HEARTBEAT_MS - (Date.now() - lastBeat))),
            ]);
            wake = null;
          }
          while (queue.length) {
            const e = queue.shift() as ZegaEvent;
            seq += 1;
            await stream.writeSSE({
              id: String(seq),
              event: e.type === "notification" ? "notification" : "request",
              data: JSON.stringify(e),
            });
          }
          if (Date.now() - lastBeat >= HEARTBEAT_MS) {
            await stream.write(": keep-alive\n\n");
            lastBeat = Date.now();
          }
        }
        unsubscribe();
      });
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/cron/maintenance",
      tags: ["System"],
      summary: "Run the background sweep (Vercel Cron)",
      description:
        "Escalates SLA breaches and auto-closes unconfirmed resolved requests. Requires `Authorization: Bearer $CRON_SECRET`.",
      responses: {
        200: json(
          z
            .object({
              ran: z.boolean(),
              escalated: z.number().optional(),
              autoClosed: z.number().optional(),
              at: z.string().optional(),
            })
            .openapi("MaintenanceResult"),
          "Sweep result",
        ),
        401: errorResponses[401],
      },
    }),
    async (c) => {
      const secret = process.env.CRON_SECRET;
      if (!secret || c.req.header("authorization") !== `Bearer ${secret}`) throw problems.unauthorized();
      return c.json(await runMaintenance(c.get("db"), { force: true }), 200);
    },
  );
}
