/**
 * Demo Business Full Test
 * Creates a fake Business account with 35 employees and screenshots every feature.
 * Run: PLAYWRIGHT_BASE_URL=https://app.clockly.es npx playwright test demo-business-full.spec.ts --headed
 */

import { expect, test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// ── Credentials ────────────────────────────────────────────────────────────────
export const DEMO = {
  company: "Demo Business SL",
  owner: "Pedro Martínez Demo",
  email: "demo.business.2026@test-clockly.com",
  password: "DemoBusiness2026!",
  kioskPin: "9999",
};

// ── Screenshots dir ────────────────────────────────────────────────────────────
const SHOT_DIR = path.join(__dirname, "screenshots", "demo-business");
fs.mkdirSync(SHOT_DIR, { recursive: true });

let shotIndex = 0;
async function shot(page: Page, name: string) {
  const filename = `${String(++shotIndex).padStart(2, "0")}_${name}.png`;
  await page.screenshot({
    path: path.join(SHOT_DIR, filename),
    fullPage: true,
  });
  console.log(`📸  ${filename}`);
}

// ── Fake 35 employees ──────────────────────────────────────────────────────────
const EMPLOYEES = [
  { first_name: "María",      last_name: "García López",       role_title: "Cajera",           pin: "1001" },
  { first_name: "Carlos",     last_name: "Rodríguez Pérez",    role_title: "Cocinero",         pin: "1002" },
  { first_name: "Ana",        last_name: "Martínez Sánchez",   role_title: "Recepcionista",    pin: "1003" },
  { first_name: "Juan",       last_name: "López García",       role_title: "Almacenero",       pin: "1004" },
  { first_name: "Laura",      last_name: "González Martínez",  role_title: "Contable",         pin: "1005" },
  { first_name: "Pedro",      last_name: "Sánchez López",      role_title: "Jefe de Sala",     pin: "1006" },
  { first_name: "Sofía",      last_name: "Ramírez Torres",     role_title: "Camarera",         pin: "1007" },
  { first_name: "Miguel",     last_name: "Fernández García",   role_title: "Técnico",          pin: "1008" },
  { first_name: "Elena",      last_name: "Díaz Rodríguez",     role_title: "Administrativa",   pin: "1009" },
  { first_name: "Roberto",    last_name: "Moreno García",      role_title: "Vigilante",        pin: "1010" },
  { first_name: "Carmen",     last_name: "Jiménez López",      role_title: "Cocinera",         pin: "1011" },
  { first_name: "Francisco",  last_name: "Álvarez Martínez",   role_title: "Repartidor",       pin: "1012" },
  { first_name: "Isabel",     last_name: "Romero Pérez",       role_title: "Limpieza",         pin: "1013" },
  { first_name: "Antonio",    last_name: "Navarro García",     role_title: "Electricista",     pin: "1014" },
  { first_name: "Marta",      last_name: "Domínguez Sánchez",  role_title: "Supervisora",      pin: "1015" },
  { first_name: "Javier",     last_name: "Ramos López",        role_title: "Mecánico",         pin: "1016" },
  { first_name: "Cristina",   last_name: "Ruiz García",        role_title: "Secretaria",       pin: "1017" },
  { first_name: "David",      last_name: "Vargas Martínez",    role_title: "Informático",      pin: "1018" },
  { first_name: "Lucía",      last_name: "Molina Pérez",       role_title: "Marketing",        pin: "1019" },
  { first_name: "Raúl",       last_name: "Torres García",      role_title: "Conductor",        pin: "1020" },
  { first_name: "Patricia",   last_name: "Ortega Sánchez",     role_title: "Enfermera",        pin: "1021" },
  { first_name: "Jorge",      last_name: "Aguilar Rodríguez",  role_title: "Fontanero",        pin: "1022" },
  { first_name: "Silvia",     last_name: "Guerrero Martínez",  role_title: "Recepcionista",    pin: "1023" },
  { first_name: "Fernando",   last_name: "Herrera García",     role_title: "Almacenero",       pin: "1024" },
  { first_name: "Verónica",   last_name: "Castro Pérez",       role_title: "Cajera",           pin: "1025" },
  { first_name: "Alejandro",  last_name: "Medina Sánchez",     role_title: "Cocinero",         pin: "1026" },
  { first_name: "Natalia",    last_name: "Cortés García",      role_title: "Camarera",         pin: "1027" },
  { first_name: "Manuel",     last_name: "Delgado Rodríguez",  role_title: "Mantenimiento",    pin: "1028" },
  { first_name: "Beatriz",    last_name: "Morales Martínez",   role_title: "Administrativa",   pin: "1029" },
  { first_name: "Óscar",      last_name: "Lara García",        role_title: "Vigilante",        pin: "1030" },
  { first_name: "Rosa",       last_name: "Flores Pérez",       role_title: "Limpieza",         pin: "1031" },
  { first_name: "Héctor",     last_name: "Reyes Sánchez",      role_title: "Técnico",          pin: "1032" },
  { first_name: "Pilar",      last_name: "Ortiz García",       role_title: "Supervisora",      pin: "1033" },
  { first_name: "Eduardo",    last_name: "Vega Rodríguez",     role_title: "Jefe de Turno",    pin: "1034" },
  { first_name: "Gloria",     last_name: "Suárez Martínez",    role_title: "Contable",         pin: "1035" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 0 — Register via API
// ═══════════════════════════════════════════════════════════════════════════════
test.describe("Demo Business Full Test", () => {
  const API = process.env.PLAYWRIGHT_API_URL ?? "https://api.clockly.es";
  let accessToken = "";
  let firstEmployeeId = "";

  // ── Register ──────────────────────────────────────────────────────────────
  test("00 — Register company via API", async ({ request, page }) => {
    const res = await request.post(`${API}/auth/register-company`, {
      data: {
        company_name: DEMO.company,
        owner_full_name: DEMO.owner,
        owner_email: DEMO.email,
        password: DEMO.password,
        timezone: "Europe/Madrid",
        plan_type: "free",
      },
    });

    if (!res.ok()) {
      const body = await res.json().catch(() => res.text());
      console.error("Registration failed:", JSON.stringify(body));
    }
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    accessToken = data.access_token;
    console.log("✅  Company registered — token obtained");

    // Screenshot the registration form in browser for the PDF
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es"}/register-company`);
    await page.waitForLoadState("networkidle");
    await shot(page, "registro_formulario");
  });

  // ── Login in browser ───────────────────────────────────────────────────────
  test("01 — Login in browser", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    await shot(page, "login_pagina");

    await page.fill('input[type="email"], input[name="email"], #email, [id*="email"]', DEMO.email);
    await page.fill('input[type="password"], input[name="password"], #password, [id*="password"]', DEMO.password);
    await shot(page, "login_relleno");

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(onboarding|dashboard|employees)/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await shot(page, "post_login");
  });

  // ── Onboarding ─────────────────────────────────────────────────────────────
  test("02 — Onboarding wizard", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"], #email, [id*="email"]', DEMO.email);
    await page.fill('input[type="password"], #password, [id*="password"]', DEMO.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 });

    const url = page.url();
    if (!url.includes("onboarding")) {
      await page.goto(`${BASE}/onboarding`);
    }
    await page.waitForLoadState("networkidle");
    await shot(page, "onboarding_empresa");

    // Step 1 — Company data
    const companyInput = page.locator('input[id="company-name"], input[placeholder*="empresa"], input[value*="Demo"]').first();
    if (await companyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await companyInput.clear();
      await companyInput.fill(DEMO.company);
    }

    // Set sector
    const sectorTrigger = page.locator('[data-slot="select-trigger"]').filter({ hasText: /sector|elige/i }).first();
    if (await sectorTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sectorTrigger.click();
      await page.locator('[data-slot="select-item"]').filter({ hasText: /hostelería|comercio/i }).first().click();
    }

    // Set company size
    const sizeTrigger = page.locator('[data-slot="select-trigger"]').filter({ hasText: /empleados|número/i }).first();
    if (await sizeTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sizeTrigger.click();
      await page.locator('[data-slot="select-item"]').filter({ hasText: /16.50/i }).first().click();
    }

    await shot(page, "onboarding_empresa_relleno");

    const saveBtn = page.locator('button[type="submit"]').filter({ hasText: /guardar|siguiente|continuar/i }).first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }
    await shot(page, "onboarding_paso2_empleado");

    // Step 2 — First employee
    const fnInput = page.locator('#employee-first-name, input[placeholder*="Nombre"]').first();
    if (await fnInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fnInput.fill("María");
      await page.locator('#employee-last-name, input[placeholder*="Apellidos"]').first().fill("García López");
      await page.locator('#employee-pin, input[inputmode="numeric"]').first().fill("9001");
      await page.locator('#employee-role-title, input[placeholder*="Puesto"]').first().fill("Cajera").catch(() => {});
      await page.locator('button[type="submit"]').filter({ hasText: /crear empleado/i }).click();
      await page.waitForTimeout(1500);
    }
    await shot(page, "onboarding_paso3_kiosk");

    // Step 3 — Kiosk PIN
    const pinInput = page.locator('#kiosk-pin').first();
    if (await pinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pinInput.fill("9001");
      await page.locator('button[type="submit"]').filter({ hasText: /guardar/i }).click();
      await page.waitForTimeout(1500);
    }
    await shot(page, "onboarding_paso4_invitaciones");

    // Step 4 — Skip invitations
    const skipBtn = page.locator('button').filter({ hasText: /omitir/i }).first();
    if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(1000);
    }
    await shot(page, "onboarding_paso5_final");

    // Step 5 — Finish onboarding
    const finishBtn = page.locator('button').filter({ hasText: /finalizar onboarding/i }).first();
    if (await finishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await finishBtn.click();
      await page.waitForTimeout(1500);
    }
    await shot(page, "onboarding_completado");
  });

  // ── Create 35 employees via API ────────────────────────────────────────────
  test("03 — Create 35 employees via API", async ({ request, page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";

    // Re-login to get fresh token from cookie
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"], #email, [id*="email"]', DEMO.email);
    await page.fill('input[type="password"], #password, [id*="password"]', DEMO.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|employees|onboarding)/, { timeout: 15000 });

    // Get access token from cookie
    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === "clockly_access");
    if (tokenCookie) accessToken = tokenCookie.value;

    let created = 0;
    for (const emp of EMPLOYEES) {
      const res = await request.post(`${API}/employees`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          first_name: emp.first_name,
          last_name: emp.last_name,
          role_title: emp.role_title,
          pin: emp.pin,
        },
      });
      if (res.ok()) {
        const d = await res.json();
        if (created === 0) firstEmployeeId = d.id ?? d.employee?.id ?? "";
        created++;
        process.stdout.write(`\r  Empleados creados: ${created}/35`);
      } else {
        const err = await res.text();
        console.warn(`\nSkipped ${emp.first_name}: ${err.slice(0, 80)}`);
      }
    }
    console.log(`\n✅  ${created} empleados creados en esta pasada (plan: Business).`);
    // Tolera que algunos ya existan (re-run) — al menos 1 nuevo creado
    expect(created).toBeGreaterThanOrEqual(1);
  });

  // ── Dashboard ──────────────────────────────────────────────────────────────
  test("04 — Dashboard", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/dashboard");
    await shot(page, "dashboard_principal");

    // Hover stats cards
    const cards = page.locator('[class*="card"], [class*="Card"]').first();
    if (await cards.isVisible({ timeout: 2000 }).catch(() => false)) await cards.hover();
    await shot(page, "dashboard_detalle");
  });

  // ── Employees list ─────────────────────────────────────────────────────────
  test("05 — Employees list", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/employees");
    await shot(page, "empleados_lista_completa");

    // Search first employee
    const search = page.locator('input[placeholder*="buscar"], input[placeholder*="earch"]').first();
    if (await search.isVisible({ timeout: 2000 }).catch(() => false)) {
      await search.fill("María");
      await page.waitForTimeout(800);
      await shot(page, "empleados_busqueda_maria");
      await search.clear();
    }

    // Filter inactive
    const filterBtn = page.locator('button').filter({ hasText: /filtro|filter/i }).first();
    if (await filterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(500);
      await shot(page, "empleados_panel_filtros");
    }
  });

  // ── Create employee via UI ─────────────────────────────────────────────────
  test("06 — Create employee via UI", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/employees/new");
    await shot(page, "empleados_formulario_nuevo");

    await page.fill('#first_name, input[name="first_name"], [placeholder*="Nombre"]', "Luis").catch(() => {});
    await page.fill('#last_name, input[name="last_name"], [placeholder*="Apellidos"]', "Prueba Test").catch(() => {});
    await page.fill('#role_title, input[name="role_title"], [placeholder*="Puesto"]', "Tester").catch(() => {});
    await page.fill('input[inputmode="numeric"][maxlength="4"]', "9999").catch(() => {});
    await shot(page, "empleados_formulario_relleno");
    // Don't submit — we don't need the extra employee
  });

  // ── Employee detail ────────────────────────────────────────────────────────
  test("07 — Employee detail", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/employees");
    await page.waitForLoadState("networkidle");

    // Click first employee row
    const row = page.locator('tr[data-href], tbody tr, [class*="employee-row"], a[href*="/employees/"]').first();
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      await row.click();
      await page.waitForLoadState("networkidle");
      await shot(page, "empleado_detalle_perfil");

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 500));
      await shot(page, "empleado_detalle_historial");
    }
  });

  // ── Import employees (CSV) ─────────────────────────────────────────────────
  test("08 — Import employees CSV page", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/employees/import");
    await shot(page, "empleados_importar_csv");
  });

  // ── Sessions / Attendance ──────────────────────────────────────────────────
  test("09 — Sessions (fichajes)", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/sessions");
    await shot(page, "fichajes_lista");

    // Date filter
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateInput.fill("2026-05-01");
      await page.waitForTimeout(600);
      await shot(page, "fichajes_filtro_fecha");
    }

    // Employee filter
    const empFilter = page.locator('[data-slot="select-trigger"]').first();
    if (await empFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await empFilter.click();
      await page.waitForTimeout(400);
      await shot(page, "fichajes_filtro_empleado");
      await page.keyboard.press("Escape");
    }
  });

  // ── Sessions payroll export ────────────────────────────────────────────────
  test("10 — Sessions payroll", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/sessions/payroll");
    await shot(page, "fichajes_nominas_exportar");
  });

  // ── Sessions ITSS ──────────────────────────────────────────────────────────
  test("11 — Sessions ITSS", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/sessions/itss");
    await shot(page, "fichajes_itss");
  });

  // ── Schedules ─────────────────────────────────────────────────────────────
  test("12 — Schedules (horarios)", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/schedules");
    await shot(page, "horarios_lista");

    // Open create schedule modal
    const newBtn = page.locator('button').filter({ hasText: /nuevo|crear|añadir|schedule/i }).first();
    if (await newBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(700);
      await shot(page, "horarios_formulario_nuevo");
      await page.keyboard.press("Escape");
    }
  });

  // ── Tickets ───────────────────────────────────────────────────────────────
  test("13 — Tickets", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/tickets");
    await shot(page, "tickets_lista");

    // Open new ticket
    const newBtn = page.locator('button').filter({ hasText: /nuevo|crear|ticket/i }).first();
    if (await newBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(700);
      await shot(page, "tickets_nuevo_modal");
      await page.keyboard.press("Escape");
    }
  });

  // ── Expenses / Gastos ─────────────────────────────────────────────────────
  test("14 — Expenses (gastos)", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/expenses");
    await shot(page, "gastos_lista");

    // New expense
    await page.goto(`${BASE}/expenses/new`);
    await page.waitForLoadState("networkidle");
    await shot(page, "gastos_nuevo_formulario");

    // Fill
    const descInput = page.locator('input[name*="desc"], input[placeholder*="descripción"], textarea').first();
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill("Material oficina prueba");
    }
    const amountInput = page.locator('input[name*="amount"], input[type="number"], input[placeholder*="importe"]').first();
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await amountInput.fill("125.50");
    }
    await shot(page, "gastos_nuevo_relleno");
  });

  // ── Late Arrivals / Retrasos ───────────────────────────────────────────────
  test("15 — Late arrivals (retrasos)", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/late-arrivals");
    await shot(page, "retrasos_lista");
  });

  // ── Analytics ─────────────────────────────────────────────────────────────
  test("16 — Analytics", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/analytics");
    await page.waitForTimeout(1500);
    await shot(page, "analytics_general");

    // Scroll to see charts
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await shot(page, "analytics_graficos");
  });

  // ── Work Locations / Ubicaciones ──────────────────────────────────────────
  test("17 — Work locations", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/work-locations");
    await shot(page, "ubicaciones_lista");

    const newBtn = page.locator('button').filter({ hasText: /nueva|añadir|location/i }).first();
    if (await newBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(600);
      await shot(page, "ubicaciones_nueva_modal");
      await page.keyboard.press("Escape");
    }
  });

  // ── Salaries ──────────────────────────────────────────────────────────────
  test("18 — Salaries (salarios)", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/salaries");
    await shot(page, "salarios_lista");
  });

  // ── Cash Closures ─────────────────────────────────────────────────────────
  test("19 — Cash closures (cierres de caja)", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/cash-closures");
    await shot(page, "cierres_caja_lista");
  });

  // ── Settings ──────────────────────────────────────────────────────────────
  test("20 — Settings (configuración)", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/settings");
    await shot(page, "configuracion_empresa");

    // Scroll
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(400);
    await shot(page, "configuracion_empresa_abajo");
  });

  // ── Kiosk (public) ────────────────────────────────────────────────────────
  test("21 — Kiosk", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await page.goto(`${BASE}/kiosk`);
    await page.waitForLoadState("networkidle");
    await shot(page, "kiosk_portada");

    // Try PIN entry
    const pinInput = page.locator('input[inputmode="numeric"], input[type="number"], input[placeholder*="PIN"]').first();
    if (await pinInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pinInput.fill("9001");
      await shot(page, "kiosk_pin_introducido");
    }
  });

  // ── Upgrade / Plan ────────────────────────────────────────────────────────
  test("22 — Upgrade plan page", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await loginAndGoto(page, BASE, "/upgrade");
    await shot(page, "upgrade_planes");
  });

  // ── Landing page (public) ─────────────────────────────────────────────────
  test("23 — Landing page & legal", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await shot(page, "landing_principal");

    await page.goto(`${BASE}/privacy`);
    await page.waitForLoadState("networkidle");
    await shot(page, "landing_privacidad");

    await page.goto(`${BASE}/terms`);
    await page.waitForLoadState("networkidle");
    await shot(page, "landing_terminos");
  });

  // ── Mobile responsive ─────────────────────────────────────────────────────
  test("24 — Mobile view dashboard", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAndGoto(page, BASE, "/dashboard");
    await shot(page, "mobile_dashboard");

    await loginAndGoto(page, BASE, "/employees");
    await shot(page, "mobile_empleados");

    await page.goto(`${BASE}/kiosk`);
    await page.waitForLoadState("networkidle");
    await shot(page, "mobile_kiosk");
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  test("25 — Final summary", async ({ page }) => {
    const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://app.clockly.es";
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAndGoto(page, BASE, "/employees");
    await page.waitForTimeout(1000);
    await shot(page, "resumen_empleados_finales");

    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await shot(page, "resumen_dashboard_final");

    // Print credentials to console
    console.log("\n\n════════════════════════════════════");
    console.log("  CREDENCIALES CUENTA DEMO BUSINESS");
    console.log("════════════════════════════════════");
    console.log(`  Empresa  : ${DEMO.company}`);
    console.log(`  Email    : ${DEMO.email}`);
    console.log(`  Password : ${DEMO.password}`);
    console.log(`  PIN Kiosk: 9001 (María García López)`);
    console.log(`  Plan     : Business (pendiente upgrade DB)`);
    console.log(`  URL      : ${BASE}`);
    console.log("════════════════════════════════════\n");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Helper — login and navigate
// ═══════════════════════════════════════════════════════════════════════════════
async function loginAndGoto(page: Page, base: string, path: string) {
  // Try to navigate directly — if redirected to login, re-auth
  await page.goto(`${base}${path}`);
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/login") || page.url().includes("/register-company")) {
    await page.fill('input[type="email"], #email, [id*="email"]', DEMO.email);
    await page.fill('input[type="password"], #password, [id*="password"]', DEMO.password);
    await page.click('button[type="submit"]');
    // Wait for any URL that is not login or register
    await page.waitForURL(
      (url) => !url.toString().includes("/login") && !url.toString().includes("/register"),
      { timeout: 20000 },
    );
    await page.goto(`${base}${path}`);
    await page.waitForLoadState("networkidle");
  }

  await page.waitForTimeout(600);
}
