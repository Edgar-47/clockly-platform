/**
 * E2E: Protected kiosk mode.
 *
 * Kiosk requires an authenticated tenant admin/manager session and backend PIN
 * validation for clock-in/out actions.
 */
import { expect, test } from "@playwright/test";
import {
  MISSING_OWNER_PASSWORD_MESSAGE,
  SKIP_AUTHENTICATED_E2E,
  loginAsOwner,
} from "./helpers/auth";

test.describe("Kiosk protection", () => {
  test("unauthenticated users are redirected to login", async ({ page }) => {
    await page.goto("/kiosk");
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});

test.describe("Kiosk with owner session", () => {
  test.skip(SKIP_AUTHENTICATED_E2E, MISSING_OWNER_PASSWORD_MESSAGE);

  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("owner can open the protected kiosk", async ({ page }) => {
    await page.goto("/kiosk");
    await expect(page).toHaveURL(/\/kiosk/, { timeout: 8000 });
    await expect(page.getByText(/Selecciona tu nombre|No hay empleados activos/i)).toBeVisible({
      timeout: 8000,
    });
  });

  test("kiosk does not render a blank crash state", async ({ page }) => {
    await page.goto("/kiosk");
    await expect(page.getByText(/Application error|unhandled/i)).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator("header")).toBeVisible({ timeout: 8000 });
  });
});
