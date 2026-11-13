import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as s from "@/server/db/schema";
import { rowsOf } from "@/server/db/types";
import { autoCloseResolved, claimJob, escalateSlaBreaches } from "@/server/services/maintenance";

import { createTestApi } from "../helpers/test-api";

let api: Awaited<ReturnType<typeof createTestApi>>;
let student: string;
let student2: string;
let admin: string;
let officer: string;

beforeAll(async () => {
  api = await createTestApi();
  student = (await api.userByEmail("student@zega.test")).id;
  student2 = (await api.userByEmail("student1@zega.test")).id;
  admin = (await api.userByEmail("admin@zega.test")).id;
  officer = (await api.userByEmail("officer@zega.test")).id;
}, 180_000);
afterAll(() => api.close());

/** Opens the SSE stream and collects events until `count` arrive or the timeout passes. */
async function listen(as: string, count: number, timeoutMs = 5000) {
  const controller = new AbortController();
  const res = await api.app.request("/api/events", { headers: { "x-test-user": as }, signal: controller.signal });
  expect(res.headers.get("content-type")).toContain("text/event-stream");
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const events: { event: string; data: Record<string, unknown> }[] = [];
  let buffer = "";
  const done = (async () => {
    while (events.filter((e) => e.event !== "ready").length < count) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buffer += new TextDecoder().decode(value);
      let i = buffer.indexOf("\n\n");
      while (i >= 0) {
        const block = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);
        const event = /^event: (.+)$/m.exec(block)?.[1];
        const data = /^data: (.+)$/m.exec(block)?.[1];
        if (event && data) events.push({ event, data: JSON.parse(data) });
        i = buffer.indexOf("\n\n");
      }
    }
  })();
  const ready = new Promise<void>((resolve) => {
    const check = () => (events.some((e) => e.event === "ready") ? resolve() : setTimeout(check, 10));
    check();
  });
  await ready;
  const finished = Promise.race([done, new Promise((r) => setTimeout(r, timeoutMs))]).finally(() => controller.abort());
  return { events, finished };
}

describe("live updates over SSE", () => {
  it("pushes a status change and a notification to the requester, and nothing to unrelated users", async () => {
    const cats = await api.call(student, "GET", "/categories");
    const locs = await api.call(student, "GET", "/locations");
    const created = await api.call(student, "POST", "/requests", {
      title: "Ceiling fan wobbling badly",
      description: "The fan shakes and makes a loud noise at full speed.",
      categoryId: cats.data[0].id,
      locationId: locs.data.find((l: { code: string }) => l.code === "ART-01").id,
    });

    // Opening a stream also triggers the background sweep, which may push other genuine events.
    const mine = await listen(student, 20, 2500);
    const stranger = await listen(student2, 1, 1500);
    await api.call(admin, "POST", `/requests/${created.data.id}/assignments`, { officerId: officer });
    await Promise.all([mine.finished, stranger.finished]);

    const status = mine.events.find((e) => e.event === "request" && e.data.refCode === created.data.refCode);
    expect(status?.data).toMatchObject({ type: "request.status", refCode: created.data.refCode, status: "assigned" });
    expect(mine.events.some((e) => e.event === "notification" && e.data.requestId === created.data.id)).toBe(true);
    expect(
      stranger.events.some((e) => e.data.refCode === created.data.refCode || e.data.requestId === created.data.id),
    ).toBe(false);
  });

  it("requires authentication", async () => {
    expect((await api.call(null, "GET", "/events")).status).toBe(401);
  });
});

describe("background sweep", () => {
  it("claims a job window only once", async () => {
    expect(await claimJob(api.db, "test-job", 300)).toBe(true);
    expect(await claimJob(api.db, "test-job", 300)).toBe(false);
  });

  it("escalates each SLA breach once, with a digest for admins", async () => {
    const digests = async () =>
      rowsOf<{ n: number }>(
        await api.db.execute(
          sql`select count(*)::int as n from notifications where user_id = ${admin} and type = 'sla.breach'`,
        ),
      )[0].n;
    const before = await digests();
    const first = await escalateSlaBreaches(api.db, new Date("2030-01-01T00:00:00Z"));
    expect(first).toBeGreaterThan(0);
    expect(await escalateSlaBreaches(api.db, new Date("2030-01-01T00:00:00Z"))).toBe(0);
    expect((await digests()) - before).toBe(1);
  });

  it("auto-closes resolved requests nobody confirmed within 72 hours", async () => {
    const [resolved] = await api.db
      .select()
      .from(s.serviceRequests)
      .where(eq(s.serviceRequests.status, "resolved"))
      .limit(1);
    const closed = await autoCloseResolved(api.db, new Date("2030-01-01T00:00:00Z"));
    expect(closed).toBeGreaterThan(0);
    const [after] = await api.db.select().from(s.serviceRequests).where(eq(s.serviceRequests.id, resolved.id));
    expect(after.status).toBe("closed");
    const timeline = await api.call(admin, "GET", `/requests/${resolved.id}/timeline`);
    const last = timeline.data.filter((i: { kind: string }) => i.kind === "status").at(-1);
    expect(last).toMatchObject({ to: "closed", actor: null });
    expect(last.note).toMatch(/automatically/);
  });

  it("protects the cron endpoint with a secret", async () => {
    expect((await api.call(null, "GET", "/cron/maintenance")).status).toBe(401);
    process.env.CRON_SECRET = "test-secret";
    const res = await api.app.request("/api/cron/maintenance", { headers: { authorization: "Bearer test-secret" } });
    expect(res.status).toBe(200);
    expect((await res.json()).ran).toBe(true);
    delete process.env.CRON_SECRET;
  });
});
