import { expect, test } from "@playwright/test";
import { loginAsOwner, SKIP_AUTHENTICATED_E2E } from "./helpers/auth";

test.describe("Board", () => {
  test.skip(SKIP_AUTHENTICATED_E2E, "Authenticated E2E requires E2E_OWNER_PASSWORD.");

  test("owner can create a board note", async ({ page }) => {
    const title = `Nota tablero ${Date.now()}`;

    await loginAsOwner(page);
    await page.goto("/board");
    await expect(page.getByRole("heading", { name: "Tablero" })).toBeVisible();

    await page.getByRole("button", { name: /nueva nota/i }).first().click();
    await page.getByLabel("Titulo").fill(title);
    await page.getByLabel("Descripcion").fill("Smoke test de tablero operativo.");
    await page.getByRole("button", { name: /crear nota/i }).click();

    await expect(page.getByText(title)).toBeVisible();
  });
});
