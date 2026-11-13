import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApi } from "../helpers/test-api";

let api: Awaited<ReturnType<typeof createTestApi>>;
let student: string;
let student2: string;
let officer: string;
let admin: string;
let categoryId: string;
let locationId: string;

beforeAll(async () => {
  api = await createTestApi();
  student = (await api.userByEmail("student@zega.test")).id;
  student2 = (await api.userByEmail("student1@zega.test")).id;
  officer = (await api.userByEmail("officer@zega.test")).id;
  admin = (await api.userByEmail("admin@zega.test")).id;
  const cats = await api.call(student, "GET", "/categories");
  categoryId = cats.data.find((c: { slug: string }) => c.slug === "plumbing").id;
  const locs = await api.call(student, "GET", "/locations");
  locationId = locs.data.find((l: { code: string }) => l.code === "MOREMI-F2-BATH").id;
}, 180_000);
afterAll(() => api.close());

describe("auth and errors", () => {
  it("rejects anonymous calls with an RFC 9457 problem", async () => {
    const res = await api.call(null, "GET", "/requests");
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(res.data).toMatchObject({
      status: 401,
      type: expect.stringContaining("unauthorized"),
      instance: "/api/requests",
    });
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("reports validation errors per field", async () => {
    const res = await api.call(student, "POST", "/requests", { title: "x", description: "short", categoryId: "nope" });
    expect(res.status).toBe(422);
    const paths = res.data.errors.map((e: { path: string }) => e.path);
    expect(paths).toEqual(expect.arrayContaining(["title", "description", "categoryId", "locationId"]));
  });

  it("is healthy and serves OpenAPI 3.1 and a Postman collection", async () => {
    expect((await api.call(null, "GET", "/health")).data.status).toBe("ok");
    const doc = await api.call(null, "GET", "/openapi.json");
    expect(doc.data.openapi).toBe("3.1.0");
    expect(Object.keys(doc.data.paths)).toEqual(
      expect.arrayContaining(["/api/requests", "/api/requests/{id}/transitions", "/api/auth/sign-in/email"]),
    );
    const postman = await api.call(null, "GET", "/postman.json");
    expect(postman.data.info.schema).toContain("v2.1.0");
    expect(postman.data.item.map((f: { name: string }) => f.name)).toEqual(
      expect.arrayContaining(["Requests", "Auth"]),
    );
  });
});

describe("listing and visibility", () => {
  it("shows students their own requests plus ones they added a me-too to", async () => {
    const all = await api.call(student, "GET", "/requests?limit=100");
    expect(all.status).toBe(200);
    const mine = await api.call(student, "GET", "/requests?limit=100&scope=mine");
    expect(mine.data.data.every((r: { requester: { id: string } }) => r.requester.id === student)).toBe(true);
    const others = all.data.data.filter((r: { requester: { id: string } }) => r.requester.id !== student);
    for (const r of others) expect((await api.call(student, "GET", `/requests/${r.id}`)).data.hasVoted).toBe(true);
  });

  it("shows officers only jobs that are or were theirs", async () => {
    const res = await api.call(officer, "GET", "/requests?limit=100&assignee=me");
    expect(res.data.data.every((r: { assignee: { id: string } }) => r.assignee?.id === officer)).toBe(true);
  });

  it("paginates with a keyset cursor without gaps or repeats", async () => {
    const all = await api.call(admin, "GET", "/requests?limit=100");
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const res: { data: { data: { id: string }[]; pageInfo: { nextCursor: string | null } } } = await api.call(
        admin,
        "GET",
        `/requests?limit=7${cursor ? `&cursor=${cursor}` : ""}`,
      );
      seen.push(...res.data.data.map((r) => r.id));
      cursor = res.data.pageInfo.nextCursor;
    } while (cursor);
    expect(seen).toEqual(all.data.data.map((r: { id: string }) => r.id));
    expect(all.data.pageInfo.total).toBe(seen.length);
  });

  it("filters by status, priority and sort order", async () => {
    const res = await api.call(admin, "GET", "/requests?status=closed&sort=oldest&limit=50");
    expect(res.data.data.every((r: { status: string }) => r.status === "closed")).toBe(true);
    const times = res.data.data.map((r: { createdAt: string }) => r.createdAt);
    expect([...times].sort()).toEqual(times);
    const byPriority = await api.call(admin, "GET", "/requests?sort=priority&limit=100");
    const order = ["low", "medium", "high", "urgent"];
    const ranks = byPriority.data.data.map((r: { priority: string }) => order.indexOf(r.priority));
    expect([...ranks].sort((a, b) => b - a)).toEqual(ranks);
  });

  it("finds a request by reference code and hides other people's requests", async () => {
    const mine = (await api.call(student, "GET", "/requests?limit=1")).data.data[0];
    const byRef = await api.call(student, "GET", `/requests/${mine.refCode}`);
    expect(byRef.data.id).toBe(mine.id);
    expect((await api.call(student2, "GET", `/requests/${mine.id}`)).status).toBe(404);
  });
});

describe("request lifecycle", () => {
  let id: string;

  it("lets a student report an issue with SLA due dates and notifies admins", async () => {
    const res = await api.call(student, "POST", "/requests", {
      title: "Leaking pipe in the shower block",
      description: "Water is pooling on the floor near the second cubicle.",
      categoryId,
      locationId,
    });
    expect(res.status).toBe(201);
    id = res.data.id;
    expect(res.data).toMatchObject({
      status: "submitted",
      priority: "high",
      location: { label: "Moremi Hall › Floor 2 › Shower block" },
    });
    expect(res.data.refCode).toMatch(/^ZG-\d{2}-\d{6}$/);
    expect(new Date(res.data.resolutionDueAt).getTime()).toBeGreaterThan(Date.now());
    expect(res.data.availableTransitions.map((t: { to: string }) => t.to)).toEqual(["cancelled"]);
    const notes = await api.call(admin, "GET", "/notifications?unread=true");
    expect(notes.data.data.some((n: { requestId: string }) => n.requestId === id)).toBe(true);
  });

  it("detects it as similar to a new report at the same place, and accepts a me-too vote", async () => {
    const similar = await api.call(
      student2,
      "GET",
      `/requests/similar?title=${encodeURIComponent("leaking pipe shower")}&locationId=${locationId}&categoryId=${categoryId}`,
    );
    expect(similar.data.some((r: { id: string }) => r.id === id)).toBe(true);
    const vote = await api.call(student2, "PUT", `/requests/${id}/vote`);
    expect(vote.data).toEqual({ voteCount: 1, hasVoted: true });
    expect((await api.call(student, "PUT", `/requests/${id}/vote`)).status).toBe(409);
    // Voting makes the request visible to the voter.
    expect((await api.call(student2, "GET", `/requests/${id}`)).status).toBe(200);
  });

  it("blocks students and officers from assigning, and rejects invalid moves", async () => {
    expect((await api.call(student, "POST", `/requests/${id}/assignments`, { officerId: officer })).status).toBe(403);
    expect((await api.call(admin, "POST", `/requests/${id}/transitions`, { to: "resolved" })).status).toBe(409);
    expect((await api.call(admin, "POST", `/requests/${id}/assignments`, { officerId: student })).status).toBe(422);
  });

  it("ranks officers with the matching specialty first", async () => {
    const res = await api.call(admin, "GET", `/requests/${id}/suggestions`);
    expect(res.status).toBe(200);
    expect(res.data[0].specialist).toBe(true);
    expect(res.data[0].specialties).toContain("Plumbing");
  });

  it("assigns an officer, who then works and resolves the job", async () => {
    const assigned = await api.call(admin, "POST", `/requests/${id}/assignments`, {
      officerId: officer,
      note: "Please prioritise",
    });
    expect(assigned.data).toMatchObject({ status: "assigned", assignee: { id: officer } });
    expect(assigned.data.firstResponseAt).toBeTruthy();

    expect((await api.call(officer, "POST", `/requests/${id}/transitions`, { to: "in_progress" })).data.status).toBe(
      "in_progress",
    );
    const noNote = await api.call(officer, "POST", `/requests/${id}/transitions`, { to: "resolved" });
    expect(noNote.status).toBe(422);
    const resolved = await api.call(officer, "POST", `/requests/${id}/transitions`, {
      to: "resolved",
      note: "Replaced the washer.",
    });
    expect(resolved.data.status).toBe("resolved");
    expect(resolved.data.resolvedAt).toBeTruthy();
  });

  it("hides internal notes from the requester", async () => {
    await api.call(officer, "POST", `/requests/${id}/comments`, {
      body: "Used spare washer from store",
      internal: true,
    });
    await api.call(officer, "POST", `/requests/${id}/comments`, { body: "All fixed, please check.", internal: false });
    expect((await api.call(student, "POST", `/requests/${id}/comments`, { body: "x", internal: true })).status).toBe(
      403,
    );
    const forStudent = await api.call(student, "GET", `/requests/${id}/comments`);
    expect(forStudent.data.map((c: { body: string }) => c.body)).toEqual(["All fixed, please check."]);
    const forOfficer = await api.call(officer, "GET", `/requests/${id}/comments`);
    expect(forOfficer.data).toHaveLength(2);
  });

  it("lets the requester confirm with a rating and returns an ordered timeline", async () => {
    expect((await api.call(officer, "POST", `/requests/${id}/transitions`, { to: "closed" })).status).toBe(403);
    const closed = await api.call(student, "POST", `/requests/${id}/transitions`, {
      to: "closed",
      rating: { score: 5, comment: "Fast!" },
    });
    expect(closed.data).toMatchObject({
      status: "closed",
      rating: { score: 5, comment: "Fast!" },
      availableTransitions: [],
    });
    const timeline = await api.call(student, "GET", `/requests/${id}/timeline`);
    const statuses = timeline.data
      .filter((i: { kind: string }) => i.kind === "status")
      .map((i: { to: string }) => i.to);
    expect(statuses).toEqual(["submitted", "assigned", "in_progress", "resolved", "closed"]);
    expect(timeline.data.some((i: { kind: string; internal?: boolean }) => i.kind === "comment" && i.internal)).toBe(
      false,
    );
  });

  it("records every step on the audit trail with the right actors", async () => {
    const audit = await api.call(admin, "GET", `/audit?table=status_logs&limit=100`);
    const actors = new Set(audit.data.data.slice(0, 5).map((a: { actorId: string }) => a.actorId));
    expect(actors).toEqual(new Set([student, admin, officer]));
    const verify = await api.call(admin, "GET", "/audit/verify");
    expect(verify.data).toMatchObject({ intact: true });
    expect((await api.call(student, "GET", "/audit")).status).toBe(403);
  });
});

describe("admin features", () => {
  it("creates an officer, sets specialties, and deactivation blocks access", async () => {
    const created = await api.call(admin, "POST", "/users", {
      name: "Kunle Ade",
      email: "kunle@zega.test",
      password: "Passw0rd!",
      role: "officer",
    });
    expect(created.status).toBe(201);
    const cats = await api.call(admin, "GET", "/categories");
    const spec = await api.call(admin, "PUT", `/users/${created.data.id}/specialties`, {
      categoryIds: [cats.data[0].id],
    });
    expect(spec.data.specialties).toEqual([cats.data[0].slug]);
    expect((await api.call(created.data.id, "GET", "/me")).status).toBe(200);
    await api.call(admin, "PATCH", `/users/${created.data.id}`, { banned: true });
    expect((await api.call(created.data.id, "GET", "/me")).status).toBe(401);
    expect((await api.call(admin, "PATCH", `/users/${admin}`, { role: "student" })).status).toBe(409);
  });

  it("validates SLA targets", async () => {
    const res = await api.call(admin, "PUT", `/categories/${categoryId}/sla`, {
      policies: [{ priority: "high", responseMinutes: 120, resolutionMinutes: 60 }],
    });
    expect(res.status).toBe(422);
  });

  it("summarises operations and exports CSV safely", async () => {
    const sum = await api.call(admin, "GET", "/reports/summary?from=2026-08-01&to=2026-11-12");
    expect(sum.status).toBe(200);
    expect(sum.data.totals.total).toBeGreaterThan(0);
    expect(sum.data.byCategory.length).toBeGreaterThan(0);
    expect((await api.call(student, "GET", "/reports/summary")).status).toBe(403);

    const csv = await api.call(admin, "GET", "/exports/requests.csv?status=closed");
    expect(csv.headers.get("content-type")).toContain("text/csv");
    const lines = (csv.data as string).trim().split("\r\n");
    expect(lines[0]).toContain("Reference,Title,Status");
    expect(lines.length).toBeGreaterThan(1);
  });

  it("resolves a QR sticker token to its location", async () => {
    const locs = await api.call(student, "GET", "/locations");
    const room = locs.data.find((l: { id: string }) => l.id === locationId);
    const res = await api.call(student, "GET", `/locations/qr/${room.qrToken}`);
    expect(res.data.label).toBe("Moremi Hall › Floor 2 › Shower block");
  });
});

describe("photo attachments", () => {
  const JPEG = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9,
  ]);
  const upload = async (
    as: string,
    id: string,
    bytes: Uint8Array<ArrayBuffer>,
    kind = "evidence",
    name = "photo.jpg",
  ) => {
    const form = new FormData();
    form.set("file", new File([bytes as Uint8Array<ArrayBuffer>], name, { type: "image/jpeg" }));
    form.set("kind", kind);
    const res = await api.app.request(`/api/requests/${id}/attachments`, {
      method: "POST",
      headers: { "x-test-user": as },
      body: form,
    });
    return { status: res.status, data: await res.json() };
  };

  it("accepts evidence from the requester and shows it on the request", async () => {
    const created = await api.call(student, "POST", "/requests", {
      title: "Broken window louvres",
      description: "Two louvres fell out during the storm last night.",
      categoryId,
      locationId,
    });
    const res = await upload(student, created.data.id, JPEG);
    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({ kind: "evidence", contentType: "image/jpeg" });
    expect(api.storage.files.size).toBe(1);
    const detail = await api.call(student, "GET", `/requests/${created.data.id}`);
    expect(detail.data.attachments).toHaveLength(1);
  });

  it("rejects files that are not really images, whatever their name says", async () => {
    const created = await api.call(student, "POST", "/requests", {
      title: "Door lock jammed in room",
      description: "The lock will not turn with the key at all.",
      categoryId,
      locationId,
    });
    const fake = new TextEncoder().encode("<script>alert(1)</script>") as Uint8Array<ArrayBuffer>;
    const res = await upload(student, created.data.id, fake, "evidence", "evil.jpg");
    expect(res.status).toBe(422);
    expect(res.data.detail).toMatch(/JPEG, PNG or WebP/);
  });

  it("stops requesters adding officer before/after photos", async () => {
    const mine = (await api.call(student, "GET", "/requests?scope=mine&open=true&limit=1")).data.data[0];
    expect((await upload(student, mine.id, JPEG, "after")).status).toBe(403);
  });
});

describe("officer tools", () => {
  it("summarises an officer's workload and refuses other roles", async () => {
    const res = await api.call(officer, "GET", "/reports/officer");
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      open: expect.any(Number),
      overdue: expect.any(Number),
      dueSoon: expect.any(Number),
    });
    expect((await api.call(student, "GET", "/reports/officer")).status).toBe(403);
  });

  it("tells each viewer which photo kinds they may upload", async () => {
    const job = (await api.call(officer, "GET", "/requests?assignee=me&status=in_progress&limit=1")).data.data[0];
    if (job) {
      const asOfficer = await api.call(officer, "GET", `/requests/${job.id}`);
      expect(asOfficer.data.can.upload).toEqual(["before", "after"]);
    }
    const mine = (await api.call(student, "GET", "/requests?scope=mine&open=true&limit=1")).data.data[0];
    expect((await api.call(student, "GET", `/requests/${mine.id}`)).data.can.upload).toEqual(["evidence"]);
  });
});

describe("PDF report", () => {
  it("generates a real PDF for admins only", async () => {
    const res = await api.app.request("/api/reports/summary.pdf?from=2026-08-01&to=2026-11-12", {
      headers: { "x-test-user": admin },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(2000);
    expect((await api.call(officer, "GET", "/reports/summary.pdf")).status).toBe(403);
  }, 60_000);
});
