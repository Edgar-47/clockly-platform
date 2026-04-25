/**
 * E2E: Role-based access restrictions.
 *
 * Verifies that the frontend route guards work correctly per role.
 * These tests rely on the middleware/layout redirect logic.
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
});

test.describe("Public kiosk access", () => {
  test("kiosk page is accessible without login", async ({ page }) => {
    await page.goto("/kiosk");
    // Should not redirect to login — kiosk is public
    await expect(page).not.toHaveURL(/login/);
  });
});
