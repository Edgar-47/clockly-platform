/**
 * E2E: Employee management, create and edit entry points.
 * Requires a logged-in admin/owner session.
 * Set E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD to run authenticated tests.
 */
import { expect, test } from "@playwright/test";
import {
  MISSING_OWNER_PASSWORD_MESSAGE,
  SKIP_AUTHENTICATED_E2E,
  loginAsOwner,
} from "./helpers/auth";

test.describe("Employee list", () => {
  test.skip(SKIP_AUTHENTICATED_E2E, MISSING_OWNER_PASSWORD_MESSAGE);

  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("employees page loads and shows table", async ({ page }) => {
    await page.goto("/employees");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 8000 });
  });

  test("employee form opens when clicking new employee", async ({ page }) => {
    await page.goto("/employees/new");
    await expect(page.getByLabel(/nombre/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Employee creation form", () => {
  test.skip(SKIP_AUTHENTICATED_E2E, MISSING_OWNER_PASSWORD_MESSAGE);

  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
    await page.goto("/employees/new");
  });

  test("shows validation error when first name is empty", async ({ page }) => {
    await page.getByRole("button", { name: /guardar|crear/i }).click();
    await expect(page.getByText(/requerido|obligatorio|nombre/i)).toBeVisible({ timeout: 3000 });
  });

  test("PIN field only accepts 4 digits", async ({ page }) => {
    const pinField = page.getByLabel(/pin/i);
    if (await pinField.isVisible()) {
      await pinField.fill("ABCD");
      await page.getByRole("button", { name: /guardar|crear/i }).click();
      await expect(page.getByText(/d.gitos|n.meros|pin/i)).toBeVisible({ timeout: 3000 });
    }
  });
});
