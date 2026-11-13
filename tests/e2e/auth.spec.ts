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

  test("admins see the administration menu and can sign out", async ({ page, isMobile }) => {
    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Admin" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("SLA compliance")).toBeVisible();
    if (isMobile) {
      // Phones: primary destinations in the bottom tab bar, everything else (and the account) in the sidebar.
      const tabs = page.getByRole("navigation", { name: "Main" });
      await tabs.getByRole("link", { name: "Audit" }).click();
      await expect(page).toHaveURL(/\/dashboard\/admin\/audit$/);
      await page.getByRole("button", { name: "Toggle Sidebar" }).click();
      await page.getByRole("button", { name: /Administrator/ }).click();
    } else {
      await expect(page.getByRole("link", { name: "Audit trail" }).first()).toBeVisible();
      await page.getByRole("button", { name: "Account menu" }).click();
    }
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("phones get a bottom tab bar with a prominent report action", async ({ page, isMobile }) => {
    test.skip(!isMobile, "tab bar is phone-only");
    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Student" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const tabs = page.getByRole("navigation", { name: "Main" });
    await tabs.getByRole("link", { name: "Report" }).click();
    await expect(page).toHaveURL(/\/dashboard\/requests\/new$/);
    await expect(tabs.getByRole("link", { name: "Report" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(/Step 1 of 4/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
  });
});
