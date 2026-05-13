/**
 * E2E: Role-based access restrictions.
 *
 * Verifies that protected frontend routes redirect unauthenticated users.
 */
import { expect, test } from "@playwright/test";

test.describe("Unauthenticated access", () => {
  test("accessing /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test("accessing /employees redirects to /login", async ({ page }) => {
    await page.goto("/employees");
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test("accessing /analytics redirects to /login", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test("accessing /settings redirects to /login", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test("accessing /kiosk redirects to /login", async ({ page }) => {
    await page.goto("/kiosk");
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});
