import { expect, test } from "@playwright/test";

import path from "node:path";

test.describe("student reports and tracks an issue", () => {
  test.setTimeout(180_000);

  test("guided report with photo, then tracking and commenting", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Student" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/dashboard/requests/new");
    // Step 1: category
    await page.getByRole("button", { name: /Plumbing/ }).click();
    // Step 2: location (search then pick)
    await page.getByLabel("Search locations").fill("Moremi");
    await page.getByRole("option", { name: /Floor 2 › Shower block/ }).click();
    await page.getByLabel("Exact spot (optional)").fill("Second cubicle from the door");
    await page.getByRole("button", { name: "Continue" }).click();
    // Step 3: details
    const title = `E2E leaking pipe ${Date.now()}`;
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("What is happening?").fill("Water is pooling on the floor and spreading into the corridor.");
    await page.getByRole("button", { name: /^urgent/i }).click();
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "../fixtures/leaking-pipe.jpg"));
    await expect(page.getByAltText("Attachment 1 preview")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    // Step 4: review and submit
    await expect(page.getByText("Check and submit")).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();
    await page.getByRole("button", { name: "Submit request" }).click();

    await expect(page.getByRole("heading", { name: "Request submitted" })).toBeVisible({ timeout: 90_000 });
    const ref = (await page.locator("button.font-mono").first().innerText()).trim();
    expect(ref).toMatch(/^ZG-\d{2}-\d{6}$/);

    await page.getByRole("link", { name: "Track this request" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Submitted").first()).toBeVisible();
    await expect(page.getByAltText(/Reported by/)).toBeVisible();

    await page.getByLabel("Add a comment").fill("It is getting worse, please hurry.");
    await page.getByRole("button", { name: "Comment" }).click();
    await expect(page.getByText("It is getting worse, please hurry.")).toBeVisible({ timeout: 60_000 });

    await page.goto("/dashboard/requests");
    await expect(page.getByText(title)).toBeVisible({ timeout: 60_000 });
  });
});
