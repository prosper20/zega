import { type APIRequestContext, expect, type Locator, type Page, request, test } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const PASSWORD = "Zega@2026!";

async function apiAs(email: string): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: BASE } });
  const res = await ctx.post("/api/auth/sign-in/email", { data: { email, password: PASSWORD } });
  expect(res.ok()).toBeTruthy();
  return ctx;
}

async function loginUi(page: Page, role: "Student" | "Officer") {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: role }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** dnd-kit's pointer sensor needs real, gradual pointer movement. */
async function drag(page: Page, from: Locator, to: Locator) {
  await from.scrollIntoViewIfNeeded();
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error("element not visible");
  // Grab the card footer (the title is a link and intentionally does not start a drag).
  const startX = a.x + 24;
  const startY = a.y + a.height - 14;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 10, startY + 10, { steps: 5 });
  // Drop level with the card (clamped inside the target column) so it stays on screen however long the columns get.
  const dropY = Math.min(Math.max(startY, b.y + 60), b.y + b.height - 20);
  await page.mouse.move(b.x + b.width / 2, dropY, { steps: 25 });
  await page.mouse.up();
}

test.describe("full request lifecycle across roles", () => {
  test.setTimeout(240_000);
  test.skip(({ isMobile }) => isMobile, "pointer drag-and-drop is exercised on desktop");

  test("student reports, admin assigns, officer works it on the board, student confirms", async ({ page }) => {
    const title = `E2E lifecycle socket ${Date.now()}`;
    const student = await apiAs("student@zega.test");
    const admin = await apiAs("admin@zega.test");

    const categories = await (await student.get("/api/categories")).json();
    const locations = await (await student.get("/api/locations")).json();
    const created = await (
      await student.post("/api/requests", {
        data: {
          title,
          description: "The wall socket near the desk sparks when used.",
          categoryId: categories.find((c: { slug: string }) => c.slug === "electrical").id,
          locationId: locations.find((l: { code: string }) => l.code === "SCI-03").id,
          priority: "high",
        },
      })
    ).json();
    expect(created.refCode).toMatch(/^ZG-/);

    const officers = await (await admin.get("/api/users?role=officer&q=officer@zega.test")).json();
    const officerId = officers.data[0].id;
    const assigned = await admin.post(`/api/requests/${created.id}/assignments`, {
      data: { officerId, note: "E2E assignment" },
    });
    expect(assigned.ok()).toBeTruthy();

    // Officer: drag Assigned -> In progress -> Resolved (with a note).
    await loginUi(page, "Officer");
    await page.goto("/dashboard/work");
    const card = () => page.locator("div.touch-none", { hasText: title });
    const column = (name: string) => page.getByRole("region", { name: new RegExp(`^${name} \\(`) });
    await expect(card()).toBeVisible({ timeout: 60_000 });
    await expect(column("Assigned").getByText(title).first()).toBeVisible();

    await drag(page, card(), column("In progress"));
    await expect(column("In progress").getByText(title).first()).toBeVisible({ timeout: 60_000 });

    // Let the move save and the board refetch (a re-render mid-drag cancels the drag) before the next one.
    await expect(page.getByText(`${created.refCode} moved to In progress`)).toBeVisible({ timeout: 60_000 });
    await page.waitForLoadState("networkidle");
    await expect(card()).toHaveCount(1);
    await drag(page, card(), column("Resolved"));
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("What did you do to fix it?").fill("Replaced the faulty socket and tested it.");
    await page.getByRole("dialog").getByRole("button", { name: "Mark resolved" }).click();
    await expect(column("Resolved").getByText(title).first()).toBeVisible({ timeout: 60_000 });

    // Student: confirm the fix with a rating.
    await page.context().clearCookies();
    await loginUi(page, "Student");
    await page.goto(`/dashboard/requests/${created.refCode}`);
    await expect(page.getByText("Is it fixed?")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Confirm fix" }).click();
    await page.getByRole("button", { name: "5 stars" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm fix" }).click();
    await expect(page.getByText("Closed").first()).toBeVisible({ timeout: 60_000 });

    const timeline = await (await student.get(`/api/requests/${created.id}/timeline`)).json();
    const statuses = timeline.filter((i: { kind: string }) => i.kind === "status").map((i: { to: string }) => i.to);
    expect(statuses).toEqual(["submitted", "assigned", "in_progress", "resolved", "closed"]);
    const detail = await (await student.get(`/api/requests/${created.id}`)).json();
    expect(detail.rating.score).toBe(5);
  });
});
