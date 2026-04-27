/**
 * E2E: Auth flows, login, logout and informational recovery state.
 *
 * Authenticated cases require a running backend + frontend with a seeded owner.
 */
import { expect, test } from "@playwright/test";
import {
  MISSING_OWNER_PASSWORD_MESSAGE,
  OWNER_EMAIL,
  SKIP_AUTHENTICATED_E2E,
  loginAsOwner,
  requireOwnerPassword,
} from "./helpers/auth";

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows login form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /acceder al panel/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contrase.a/i)).toBeVisible();
  });

  test("shows error on wrong credentials", async ({ page }) => {
    await page.getByLabel(/email/i).fill("nobody@test.com");
    await page.getByLabel(/contrase.a/i).fill("wrongpassword");
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
  });

  test("shows validation error on empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /entrar/i }).click();
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeFocused();
  });

  test("valid login redirects to dashboard", async ({ page }) => {
    test.skip(SKIP_AUTHENTICATED_E2E, MISSING_OWNER_PASSWORD_MESSAGE);
    const ownerPassword = requireOwnerPassword();

    await page.getByLabel(/email/i).fill(OWNER_EMAIL);
    await page.getByLabel(/contrase.a/i).fill(ownerPassword);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 8000 });
  });
});

test.describe("Logout", () => {
  test("logout redirects to login", async ({ page }) => {
    test.skip(SKIP_AUTHENTICATED_E2E, MISSING_OWNER_PASSWORD_MESSAGE);

    await loginAsOwner(page);
    await page.getByRole("button", { name: /cerrar sesi.n|logout|salir/i }).click();
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});

test.describe("Forgot password", () => {
  test("forgot-password page shows informational message", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /recuperar acceso/i })).toBeVisible();
    await expect(page.getByText(/Contacta con el administrador/i)).toBeVisible();
  });

  test("forgot-password page has link back to login", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("link", { name: /volver|login|iniciar/i })).toBeVisible();
  });
});
