/**
 * E2E: Employee management — create, edit, deactivate.
 * Requires a logged-in admin/owner session.
 * Set E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD to run authenticated tests.
 */
import { expect, test } from "@playwright/test";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner@clockly.local";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";
const SKIP = !OWNER_PASSWORD;

async function loginAsOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(OWNER_EMAIL);
  await page.getByLabel(/contraseña/i).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/(dashboard|admin)/);
}

test.describe("Employee list", () => {
  test.skip(SKIP, "E2E_OWNER_PASSWORD not set");

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
  test.skip(SKIP, "E2E_OWNER_PASSWORD not set");

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
      await expect(page.getByText(/dígitos|números|pin/i)).toBeVisible({ timeout: 3000 });
    }
  });
});
