import { expect, test } from "@playwright/test";

test.describe("authentication and role-based access", () => {
  test("signed-out users are sent to login and returned afterwards", async ({ page }) => {
    await page.goto("/dashboard/profile");
    await expect(page).toHaveURL(/\/auth\/login\?next=%2Fdashboard%2Fprofile/);
    await page.getByLabel("Email address").fill("student@zega.test");
    await page.getByLabel("Password").fill("Zega@2026!");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard\/profile$/);
    await expect(page.getByRole("heading", { name: "Profile & sessions" })).toBeVisible();
    await expect(page.getByText("This device")).toBeVisible();
  });

  test("a wrong password shows an error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Email address").fill("student@zega.test");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Incorrect email or password.").first()).toBeVisible();
  });

  test("students cannot open admin pages and only see their own navigation", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Student" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("link", { name: "Report an issue" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "All requests" })).toHaveCount(0);
    await page.goto("/dashboard/admin/requests");
    await expect(page).toHaveURL(/\/unauthorized$/);
  });

  test("admins see the administration menu and can sign out", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Admin" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("link", { name: "All requests" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
