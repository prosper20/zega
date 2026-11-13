import { expect, request, test } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test.describe("live updates", () => {
  test.setTimeout(180_000);
  test.skip(({ isMobile }) => isMobile, "one live-update run is enough");

  test("the tracking page updates by itself when an admin assigns the request", async ({ page }) => {
    const api = async (email: string) => {
      const ctx = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: BASE } });
      expect(
        (await ctx.post("/api/auth/sign-in/email", { data: { email, password: "Zega@2026!" } })).ok(),
      ).toBeTruthy();
      return ctx;
    };
    const student = await api("student@zega.test");
    const admin = await api("admin@zega.test");
    const cats = await (await student.get("/api/categories")).json();
    const locs = await (await student.get("/api/locations")).json();
    const created = await (
      await student.post("/api/requests", {
        data: {
          title: `E2E live update ${Date.now()}`,
          description: "Checks that the page updates without a reload.",
          categoryId: cats[0].id,
          locationId: locs.find((l: { code: string }) => l.code === "ICT-02").id,
        },
      })
    ).json();

    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Student" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/dashboard/requests/${created.refCode}`);
    await expect(page.getByText("Not assigned yet")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Live", { exact: true })).toBeVisible({ timeout: 60_000 });

    let navigations = 0;
    page.on("framenavigated", (f) => f === page.mainFrame() && navigations++);

    const officers = await (await admin.get("/api/users?role=officer&limit=1")).json();
    expect(
      (await admin.post(`/api/requests/${created.id}/assignments`, { data: { officerId: officers.data[0].id } })).ok(),
    ).toBeTruthy();

    // No reload: the officer, status and timeline update in place, and a toast announces it.
    await expect(page.getByText(officers.data[0].name).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(new RegExp(`${created.refCode} has been assigned`)).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page
        .getByText(/assigned/i)
        .filter({ hasText: officers.data[0].name })
        .first(),
    ).toBeVisible();
    expect(navigations).toBe(0);
  });
});
