import { expect, test } from "@playwright/test";

test("landing page shows the hero and primary calls to action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Reported, tracked and resolved");
  await expect(page.getByRole("link", { name: "Report an issue" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Log in" }).first().click();
  await expect(page).toHaveURL(/\/auth\/login/);
});
