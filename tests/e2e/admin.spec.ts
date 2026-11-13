import { expect, request, test } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test.describe("administrator tools", () => {
  test.setTimeout(240_000);
  test.skip(({ isMobile }) => isMobile, "admin console is exercised on desktop");

  test("assign with smart suggestions, manage users, verify audit and download reports", async ({ page }) => {
    // A fresh unassigned request, created through the API as a student.
    const student = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: BASE } });
    expect(
      (
        await student.post("/api/auth/sign-in/email", { data: { email: "student@zega.test", password: "Zega@2026!" } })
      ).ok(),
    ).toBeTruthy();
    const cats = await (await student.get("/api/categories")).json();
    const locs = await (await student.get("/api/locations")).json();
    const title = `E2E admin projector ${Date.now()}`;
    const created = await (
      await student.post("/api/requests", {
        data: {
          title,
          description: "Projector will not power on before the 10am lecture.",
          categoryId: cats.find((c: { slug: string }) => c.slug === "classroom-equipment").id,
          locationId: locs.find((l: { code: string }) => l.code === "LT-01").id,
        },
      })
    ).json();

    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Admin" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("SLA compliance")).toBeVisible({ timeout: 60_000 });

    // Find it in the requests table via search, open it, assign the top suggestion.
    await page.goto("/dashboard/admin/requests");
    await page.getByLabel("Search requests").fill(created.refCode);
    await page.getByRole("link", { name: new RegExp(title) }).click();
    await expect(page.getByText("Suggested officers")).toBeVisible({ timeout: 60_000 });
    const top = page.getByRole("button", { name: /^Assign / }).first();
    const officerName = (await top.getAttribute("aria-label"))?.replace("Assign ", "") ?? "";
    await top.click();
    await expect(page.getByText(`Assigned to ${officerName}`).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Assigned").first()).toBeVisible();

    // Users: the new assignment is reflected; officers can be filtered.
    await page.goto("/dashboard/admin/users?role=officer");
    await expect(page.getByText(officerName).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("What each role can do")).toBeVisible();

    // Audit: verify the hash chain end to end.
    await page.goto("/dashboard/admin/audit");
    await page.getByRole("button", { name: "Verify integrity" }).click();
    await expect(page.getByText(/^Intact: all .* entries verified$/)).toBeVisible({ timeout: 90_000 });

    // Reports: PDF and CSV downloads.
    const pdf = await page.request.get("/api/reports/summary.pdf");
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    const csv = await page.request.get(`/api/exports/requests.csv?q=${created.refCode}`);
    expect(await csv.text()).toContain(created.refCode);
  });
});
