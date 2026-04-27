import type { Page } from "@playwright/test";

export const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner@clockly.local";
export const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";
export const MISSING_OWNER_PASSWORD_MESSAGE =
  "E2E_OWNER_PASSWORD is required for authenticated E2E tests. Set the GitHub Actions secret E2E_OWNER_PASSWORD or export it locally.";

const AUTHENTICATED_E2E_REQUIRED =
  process.env.CI === "true" || process.env.E2E_AUTH_REQUIRED === "true";

export const SKIP_AUTHENTICATED_E2E =
  !OWNER_PASSWORD && !AUTHENTICATED_E2E_REQUIRED;

export function requireOwnerPassword(): string {
  if (OWNER_PASSWORD) return OWNER_PASSWORD;
  throw new Error(MISSING_OWNER_PASSWORD_MESSAGE);
}

export async function loginAsOwner(page: Page) {
  const ownerPassword = requireOwnerPassword();
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(OWNER_EMAIL);
  await page.getByLabel(/contrase.a/i).fill(ownerPassword);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/(dashboard|admin)/);
}
