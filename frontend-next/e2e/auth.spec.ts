/**
 * E2E: Auth flows — login, logout, error states.
 *
 * Prerequisites: a running backend + frontend with a seeded owner account.
 * Set E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD env vars (or defaults below).
 */
import { expect, test } from "@playwright/test";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner@clockly.local";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows login form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
  });

  test("shows error on wrong credentials", async ({ page }) => {
    await page.getByLabel(/email/i).fill("nobody@test.com");
    await page.getByLabel(/contraseña/i).fill("wrongpassword");
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
  });

  test("shows validation error on empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /entrar/i }).click();
    // HTML5 or Zod validation should prevent submission
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeFocused();
  });

  test.skip(!OWNER_PASSWORD, "E2E_OWNER_PASSWORD not set")("valid login redirects to dashboard", async ({ page }) => {
    await page.getByLabel(/email/i).fill(OWNER_EMAIL);
    await page.getByLabel(/contraseña/i).fill(OWNER_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 8000 });
  });
});

test.describe("Logout", () => {
  test.skip(!OWNER_PASSWORD, "E2E_OWNER_PASSWORD not set")("logout redirects to login", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(OWNER_EMAIL);
    await page.getByLabel(/contraseña/i).fill(OWNER_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/(dashboard|admin)/);

    // Logout via sidebar or user menu
    await page.getByRole("button", { name: /cerrar sesión|logout|salir/i }).click();
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});

test.describe("Forgot password", () => {
  test("forgot-password page shows informational message", async ({ page }) => {
    await page.goto("/forgot-password");
    // Should not redirect silently — must show a message
    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.getByText(/admin|contacta|acceso/i)).toBeVisible();
  });

  test("forgot-password page has link back to login", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("link", { name: /volver|login|iniciar/i })).toBeVisible();
  });
});
