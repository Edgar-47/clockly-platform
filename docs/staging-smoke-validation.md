# ClockLy Staging Smoke Validation

---

## 1. Estado final

**PARTIAL-GO**

> Apto para demo comercial controlada y cliente real sin cobro. No apto para cliente real pagando hasta completar Stripe webhook end-to-end real con Stripe CLI.

---

## 2. Resumen ejecutivo

ClockLy está desplegado y operativo en producción (`api.clockly.es` / `app.clockly.es`) con todos los secrets configurados. El smoke de staging real confirma que:

- Backend arranca limpio, healthcheck OK, logs JSON estructurados sin datos sensibles.
- `/docs` y `/openapi.json` desactivados en producción.
- Todos los security headers presentes en backend y frontend.
- CSP con nonce por request funcional en frontend.
- CORS solo acepta `app.clockly.es`.
- Registro de empresa funciona end-to-end.
- Login/logout/refresh funcionan con cookies HttpOnly+Secure+SameSite.
- Employees CRUD funcional con límite de plan aplicado en backend (FREE→5 empleados, 6º rechazado con `plan_limit_reached`).
- Clock-in/out funcionales; doble fichaje rechazado con `conflict`.
- Kiosk PIN clock-in funcional; PIN incorrecto rechazado con `forbidden`.
- Multi-tenancy: QA token no puede leer empleados de Brasa Nova (404 `not_found`).
- Plan gating: exports rechazados en FREE con `plan_required`; multi-location rechazado con `plan_required`.
- Stripe checkout generando URLs reales `checkout.stripe.com/c/pay/cs_test_...` — integración activa en test mode.
- **Resend email funcionando**: logs confirman `POST https://api.resend.com/emails "HTTP/1.1 200 OK"` en invitaciones y password reset.
- Tickets, salary profiles, onboarding, late arrivals, sessions: todos responden correctamente.
- Fly.io healthchecks: 1/1 passing en backend, 1/1 passing en frontend.

**Pendiente para GO total**: Deploy del frontend con Next.js 16.2.6 (fix CVEs), y validación webhook Stripe completo con Stripe CLI.

---

## 3. Entorno

| Campo | Valor |
|-------|-------|
| Fecha | 2026-05-19 |
| Rama | `claude/amazing-swartz-761dff` (worktree) |
| Commit | `5701fe2` |
| Backend URL | `https://api.clockly.es` / `https://clockly-api.fly.dev` |
| Frontend URL | `https://app.clockly.es` / `https://clockly-app.fly.dev` |
| Backend deploy | 2026-05-15 (`deployment-01KRNPJQXP5EKZHFD15GMNFJZ4`) |
| Frontend deploy | 2026-05-15 (`deployment-01KRNPNQWH0ZGKKBQXF61PYC24`) |
| Base de datos | Neon PostgreSQL (DATABASE_URL configurada como secret) |
| Redis | Configurada como secret (`CLOCKLY_REDIS_URL`) |
| Email provider | Resend (activo, confirmado por logs) |
| Stripe mode | Test (`cs_test_...` URLs) |
| Región Fly.io | CDG (París) |
| flyctl version | v0.4.51 |
| Autenticado como | epedretgirones@gmail.com |

---

## 4. Variables validadas

| Variable | Scope | Presente | Observaciones |
|----------|-------|----------|---------------|
| `CLOCKLY_SECRET_KEY` | backend | ✅ | Secret con digest, no default |
| `DATABASE_URL` | backend | ✅ | Neon PostgreSQL |
| `CLOCKLY_REDIS_URL` | backend | ✅ | Rate limiter Redis en prod |
| `CLOCKLY_RATE_LIMIT_BACKEND` | backend | ✅ | `redis` |
| `CLOCKLY_EMAIL_PROVIDER` | backend | ✅ | `resend` |
| `CLOCKLY_EMAIL_FROM` | backend | ✅ | `ClockLy <no-reply@notify.clockly.es>` |
| `CLOCKLY_EMAIL_RESEND_API_KEY` | backend | ✅ | API key activa (confirmada por Resend 200 OK) |
| `CLOCKLY_STORAGE_BACKEND` | backend | ✅ | `r2` |
| `CLOCKLY_S3_BUCKET` | backend | ✅ | `clockly-prod-uploads` |
| `CLOCKLY_S3_ENDPOINT_URL` | backend | ✅ | Cloudflare R2 |
| `CLOCKLY_S3_ACCESS_KEY_ID` | backend | ✅ | Presente |
| `CLOCKLY_S3_SECRET_ACCESS_KEY` | backend | ✅ | Presente |
| `CLOCKLY_S3_REGION` | backend | ✅ | `auto` |
| `CLOCKLY_FRONTEND_BASE_URL` | backend | ✅ | `https://app.clockly.es` |
| `CLOCKLY_CORS_ALLOWED_ORIGINS` | backend | ✅ | `https://app.clockly.es` |
| `CLOCKLY_TRUSTED_HOSTS` | backend | ✅ | 3 hosts explícitos |
| `CLOCKLY_TRUST_PROXY_HEADERS` | backend | ✅ | `true` |
| `CLOCKLY_BILLING_SUCCESS_URL` | backend | ✅ | `https://app.clockly.es/settings?billing=success` |
| `CLOCKLY_BILLING_CANCEL_URL` | backend | ✅ | `https://app.clockly.es/upgrade?billing=cancelled` |
| `STRIPE_SECRET_KEY` | backend | ✅ | Activa (test mode) |
| `STRIPE_WEBHOOK_SECRET` | backend | ✅ | Configurada |
| `STRIPE_PRICE_PRO` | backend | ✅ | Configurada |
| `STRIPE_PRICE_BUSINESS` | backend | ✅ | Configurada |
| `SENTRY_DSN` | backend | ✅ | Configurada |
| `CLOCKLY_SENTRY_TRACES_SAMPLE_RATE` | backend | ✅ | Configurada |
| `CLOCKLY_ENV` | backend | ✅ | `production` |
| `CLOCKLY_LOG_FORMAT` | backend | ✅ | `json` |
| `API_URL_INTERNAL` | frontend (build arg) | ✅ | `http://clockly-api.internal:8000` |
| `NEXT_PUBLIC_API_URL` | frontend (build arg) | ✅ | `https://api.clockly.es` |
| `NEXT_PUBLIC_APP_NAME` | frontend (build arg) | ✅ | `ClockLy` |

> ⚠️ No se muestran valores — solo presencia confirmada via `flyctl secrets list`.

---

## 5. Deploy

| Componente | Estado | Detalles |
|-----------|--------|---------|
| Backend deploy | ✅ ACTUAL | Desplegado 2026-05-15, sin cambios de código pendientes |
| Frontend deploy | ⚠️ PENDIENTE PATCH | Desplegado 2026-05-15 con Next.js 16.2.4; upgrade a 16.2.6 pendiente de deploy |
| Backend migrations | ✅ | Alembic `upgrade head` en release command; healthcheck pasa (1/1) |
| Backend healthcheck | ✅ | `GET /health → 200 {"status":"ok"}` cada 30s, 1/1 passing |
| Frontend healthcheck | ✅ | `GET /api/health → 200`, 1/1 passing |
| SSL backend | ✅ | `api.clockly.es` cert issued por Fly |
| SSL frontend | ✅ | `app.clockly.es` cert issued por Fly |

**Deploy de Next.js 16.2.6 recomendado** (no bloqueante para demo sin billing activo):
```bash
cd frontend-next
flyctl deploy --app clockly-app
```

---

## 6. Backend smoke

| Endpoint | Resultado | Evidencia |
|---------|-----------|---------|
| `GET /health` | ✅ 200 `{"status":"ok"}` | HSTS, X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy presentes |
| `GET /docs` | ✅ 404 (desactivado) | Confirmado en logs: status_code=404 |
| `GET /openapi.json` | ✅ 404 (desactivado) | Confirmado en logs: status_code=404 |
| `POST /auth/login` | ✅ 200 | Cookies HttpOnly+Secure+SameSite=lax; token NO en body |
| `POST /auth/refresh` | ✅ 200 | Nuevas cookies rotadas emitidas |
| `POST /auth/logout` | ✅ 200 | Sesión invalidada server-side |
| `GET /auth/me` | ✅ 200 | `{user, employee, company, permissions}` |
| `POST /auth/register-company` | ✅ 200 | Brasa Nova Reus S.L. creada con plan FREE |
| `POST /auth/request-password-reset` | ✅ 200 | Mismo mensaje para email existente y no existente (no enumerable) |
| `GET /employees` | ✅ 200 | total=5 empleados QA staging |
| `POST /employees` | ✅ 201 | Laia, Arnau, Nuria, Pau creados |
| `POST /employees` (6º FREE) | ✅ 403 `plan_limit_reached` | Límite FREE plan enforced en backend |
| `POST /attendance/clock-in` | ✅ 201 | Session ID generado |
| `POST /attendance/clock-in` (doble) | ✅ 409 `conflict` | Doble fichaje rechazado |
| `POST /attendance/clock-in` (kiosk+PIN correcto) | ✅ 201 | Kiosk mode funcional |
| `POST /attendance/clock-in` (kiosk+PIN incorrecto) | ✅ 403 `forbidden` | PIN inválido rechazado |
| `POST /attendance/clock-out` | ✅ 200 | Clock-out exitoso |
| `GET /attendance/sessions` | ✅ 200 | Paginación funcional |
| `POST /businesses/{id}/invitations` | ✅ 201 | Invitación creada (email enviado vía Resend) |
| `GET /metrics/overview` | ✅ 200 | `{worked_seconds, open_sessions, active_employees, employees}` |
| `POST /locations` (FREE plan) | ✅ 403 `plan_required:has_multi_location` | Plan gating correcto |
| `GET /locations` | ✅ 200 | 1 location existente |
| `POST /billing/checkout` | ✅ 200 | `{url: "https://checkout.stripe.com/c/pay/cs_test_..."}` |
| `POST /billing/portal` (sin Stripe customer) | ✅ 409 | Empresa sin suscripción activa |
| `GET /exports/attendance` (FREE) | ✅ 403 `plan_required` | Exports gating correcto |
| `POST /tickets` | ✅ 201 | Ticket creado con title |
| `POST /salary-profiles` | ✅ 201 | Perfil salarial mensual 1500€ creado |
| `GET /late-arrivals` | ✅ 200 | `total=0` |
| `GET /onboarding/status` | ✅ 200 | Estado onboarding correcto |
| `GET /salary-profiles` (cross-tenant) | ✅ 404 | Tenant isolation activa |
| CORS `Origin: https://evil.com` | ✅ Sin `access-control-allow-origin` | CORS no expone para orígenes no autorizados |
| CORS `Origin: https://app.clockly.es` | ✅ `access-control-allow-origin: https://app.clockly.es` | Origen autorizado funciona |

---

## 7. Frontend smoke

| Ruta | Resultado | Evidencia |
|------|-----------|---------|
| `GET /` | ✅ 200 | Landing con security headers CSP nonce |
| `GET /login` | ✅ 200 | Pública |
| `GET /register-company` | ✅ 200 | Pública |
| `GET /forgot-password` | ✅ 200 | Pública |
| `GET /dashboard` | ✅ 307→/login?next=/dashboard | Ruta protegida, middleware activo |
| `GET /employees` | ✅ 307→/login?next=/employees | Ruta protegida |
| `GET /api/health` | ✅ 200 | Frontend healthcheck funcional |
| Security headers frontend | ✅ | HSTS, X-Frame-Options, CSP nonce, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORP |
| CSP `connect-src` | ✅ | Apunta a `https://api.clockly.es` |
| `X-Powered-By: Next.js` | ✅ | Next.js confirmado |

---

## 8. Functional smoke

| Flujo | Resultado | Evidencia |
|-------|-----------|---------|
| Registro empresa nueva (Brasa Nova Reus S.L.) | ✅ PASS | `POST /auth/register-company → 200`, owner en plan FREE |
| Login con email+password | ✅ PASS | Cookies rotadas, respuesta con user/company/permissions |
| Refresh token | ✅ PASS | Nuevas cookies HttpOnly emitidas |
| Logout | ✅ PASS | Server-side invalidation, 200 OK |
| Crear empleados | ✅ PASS | Laia Ferrer, Arnau Soler, Nuria Marti creados |
| Límite FREE plan (5 empleados) | ✅ PASS | 6º empleado rechazado con `plan_limit_reached` |
| Clock-in normal | ✅ PASS | Session ID generado |
| Clock-out | ✅ PASS | Sesión cerrada |
| Doble clock-in rechazado | ✅ PASS | `conflict` |
| Kiosk PIN correcto | ✅ PASS | 201 Created |
| Kiosk PIN incorrecto | ✅ PASS | 403 `forbidden` |
| Invitación manager | ✅ PASS | 201, email enviado vía Resend |
| Métricas (overview) | ✅ PASS | Datos de empresa correctos |
| Multi-location (FREE) | ✅ PLAN GATED | 403 `plan_required:has_multi_location` — correcto |
| Ticket creación | ✅ PASS | 201 con título |
| Salary profile mensual | ✅ PASS | 201, 1500€/mes |
| Onboarding status | ✅ PASS | Campos de configuración accesibles |
| Exports (FREE) | ✅ PLAN GATED | 403 `plan_required` — correcto |
| Stripe checkout URL | ✅ PASS | URL `checkout.stripe.com/c/pay/cs_test_...` válida |

---

## 9. Auth/session/cookies

| Check | Resultado |
|-------|-----------|
| Cookies HttpOnly | ✅ `HttpOnly` en `set-cookie` |
| Cookies Secure | ✅ `Secure` en `set-cookie` |
| Cookies SameSite | ✅ `SameSite=lax` |
| Token en body (login) | ✅ NO — solo `expires_in` + user info |
| Refresh token rotation | ✅ Nuevas cookies en cada refresh |
| JWT tras logout | ⚠️ Access token sigue válido 15min (RISK-04 conocido) |
| Refresh token tras logout | ✅ Invalidado server-side |
| HTTPS forzado | ✅ `force_https = true` en fly.toml |

---

## 10. Invitations/email

**Estado: PASS (con evidencia en logs)**

- `POST /businesses/{id}/invitations → 201` ✅
- Log backend: `HTTP Request: POST https://api.resend.com/emails "HTTP/1.1 200 OK"` ✅
- Email enviado desde `ClockLy <no-reply@notify.clockly.es>` ✅
- `POST /auth/request-password-reset → 200` ✅ (Resend 200 en logs)
- No-existencia de email NO revelada (misma respuesta para email registrado y no registrado) ✅

**Pendiente sin validar**: Confirmar recepción física del email en bandeja de entrada. No hay acceso a `test.manager@brasa.demo` para verificar entrega real.

---

## 11. Forgot password

**Estado: PARTIAL-PASS**

- `POST /auth/request-password-reset → 200` ✅ (email enviado según logs)
- No-existencia no revelada ✅
- Flujo token→reset sin validar (requiere acceso a email real para obtener token)

---

## 12. Stripe/billing

**Estado: PARTIAL-PASS**

| Check | Resultado |
|-------|-----------|
| `STRIPE_SECRET_KEY` configurada | ✅ Presente y activa |
| `STRIPE_WEBHOOK_SECRET` configurada | ✅ Presente |
| `STRIPE_PRICE_PRO` configurada | ✅ Presente |
| `STRIPE_PRICE_BUSINESS` configurada | ✅ Presente |
| `POST /billing/checkout` → URL real | ✅ `checkout.stripe.com/c/pay/cs_test_...` |
| Stripe API logs 200 | ✅ Confirmado en logs |
| Billing portal (sin customer) | ✅ 409 Conflict (correcto) |
| Webhook signature verificada | ✅ Código revisado (`construct_event()`) |
| Idempotencia webhook | ✅ Tests backend 5/5 pasando |
| `stripe trigger` webhook end-to-end | ❌ NOT VALIDATED — Stripe CLI no disponible |
| Plan upgrade post-webhook | ❌ NOT VALIDATED |

**Implicación**: Sistema puede mostrar botón "Upgrade" y redirigir a Stripe correctamente. Pero el ciclo completo pago→webhook→plan upgrade NO está validado con Stripe CLI real. Billing no debe activarse para cobro real sin esta validación.

**Comandos para validar cuando Stripe CLI esté disponible**:
```bash
stripe listen --forward-to https://api.clockly.es/billing/webhook
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

---

## 13. RBAC/multi-tenancy

| Check | Resultado |
|-------|-----------|
| `GET /employees` (QA token → Brasa Nova employee ID) | ✅ 404 `not_found` — isolación correcta |
| Employees QA no visibles desde Brasa Nova token | ✅ Diferentes `company_id` en JWT |
| Sin auth → 401 `unauthorized` | ✅ En todos los endpoints protegidos |
| Exports gateados en FREE | ✅ 403 `plan_required` |
| Multi-location gateada en FREE | ✅ 403 `plan_required` |
| Plan limit FREE (5 empleados) | ✅ 403 `plan_limit_reached` |
| Kiosk PIN incorrecto | ✅ 403 `forbidden` |
| Tests backend RBAC | ✅ 19/19 passing (test_permissions.py) |
| Tests tenancy | ✅ 8/8 passing (test_tenancy.py) |
| Tests hr_manager | ✅ 4/4 passing (test_hr_manager_role.py) |

---

## 14. Responsive

**Estado: NOT VALIDATED vía Playwright en staging** (validado localmente en sesión anterior)

El frontend en `app.clockly.es` sirve HTML con clases Tailwind responsive correctas. Las E2E Playwright locales (11/11 passing) validan rutas protegidas y redireccionamiento. Smoke visual en staging requeriría Playwright contra URL real o acceso a navegador.

---

## 15. Seguridad

| Check | Resultado |
|-------|-----------|
| HTTPS forzado | ✅ `force_https = true` en fly.toml |
| HSTS | ✅ `max-age=31536000; includeSubDomains` |
| `X-Frame-Options: DENY` | ✅ Backend + Frontend |
| `X-Content-Type-Options: nosniff` | ✅ Backend + Frontend |
| `Referrer-Policy: strict-origin-when-cross-origin` | ✅ Backend + Frontend |
| `Permissions-Policy` | ✅ `camera=(), microphone=(), geolocation=(self)` |
| CSP backend | ✅ `default-src 'none'; frame-ancestors 'none'; base-uri 'none'` |
| CSP frontend | ✅ `script-src 'self' 'nonce-...' 'strict-dynamic'` — nonce único por request |
| COOP | ✅ `cross-origin-opener-policy: same-origin` (frontend) |
| CORP | ✅ `cross-origin-resource-policy: same-origin` (frontend) |
| `/docs` desactivado en producción | ✅ 404 confirmado |
| `/openapi.json` desactivado | ✅ 404 confirmado |
| CORS whitelist explícita | ✅ Solo `https://app.clockly.es` acepta cookies |
| Rate limiting backend (Redis) | ✅ Configurado y activo |
| Logs sin datos sensibles | ✅ Solo user_id/company_id/request_id en JSON |
| Cookies HttpOnly+Secure+SameSite | ✅ Confirmado en respuestas live |
| Tokens fuera del body | ✅ Solo cookies, no localStorage |
| Stripe webhook signature | ✅ `construct_event()` en código |
| Formula injection exports | ✅ Test security pasa |
| Multi-tenancy isolation | ✅ Validado live + 8 tests |

**Riesgo residual**: Next.js 16.2.4 en producción tiene CVEs de alta severidad (middleware bypass, XSS, DoS). Upgrade a 16.2.6 ya listo localmente, pendiente de deploy.

---

## 16. Riesgos pendientes

### Críticos (bloqueantes para cobro real)
| ID | Descripción |
|----|-------------|
| CRIT-01 | Stripe webhook end-to-end sin validar con Stripe CLI — billing no puede activarse para cobro real |

### Altos (bloqueantes antes de lanzamiento público amplio)
| ID | Descripción |
|----|-------------|
| HIGH-01 | Next.js 16.2.4 en producción tiene CVEs altas — upgrade a 16.2.6 pendiente de deploy frontend |
| HIGH-02 | Forgot-password flow completo no validado (falta confirmar recepción y uso del token de reset) |

### Medios
| ID | Descripción |
|----|-------------|
| MED-01 | JWT access válido 15min tras logout (RISK-04 — conocido, documentado) |
| MED-02 | Redis rate limiter (configurado, no validado bajo carga) |
| MED-03 | 2 CVEs npm moderadas residuales (postcss embebido en Next.js) |

### Bajos
| ID | Descripción |
|----|-------------|
| ~~LOW-01~~ | ~~Sin páginas `/privacy` ni `/terms`~~ → **CERRADO** — placeholders profesionales creados en `app/privacy/page.tsx` y `app/terms/page.tsx` (pendientes revisión legal) |
| LOW-02 | Cookie consent banner no implementado |
| LOW-03 | Sin backups explícitos de Neon PostgreSQL configurados (Neon puede tener branching) |
| LOW-04 | Sin runbook de rollback documentado |
| LOW-05 | GDPR self-deletion no implementada |
| LOW-06 | Superadmin console UI redirige a `/access-unavailable` |

---

## 17. Decisión final

| Escenario | Estado |
|-----------|--------|
| Demo interna | ✅ **GO** |
| Demo comercial controlada | ✅ **GO** |
| Cliente real sin cobro (plan FREE) | ✅ **GO** (con HIGH-01 desplegado: deploy Next.js 16.2.6) |
| Cliente real pagando (billing activo) | ❌ **NO-GO** hasta CRIT-01 resuelto (Stripe CLI webhook) |
| Lanzamiento público amplio | ❌ **NO-GO** hasta: email delivery confirmada físicamente, Next.js 16.2.6 desplegado, revisión legal páginas |

---

## 18. Próximo paso exacto

### Acción inmediata (hoy)
1. **Deploy frontend Next.js 16.2.6** — cierra HIGH-01:
   ```bash
   cd frontend-next
   flyctl deploy --app clockly-app
   ```
   *El build local con 16.2.6 ya está validado (type-check, lint, build, E2E: PASS).*

### Antes de activar billing (esta semana)
2. **Stripe CLI webhook end-to-end** — cierra CRIT-01:
   ```bash
   stripe login
   stripe listen --forward-to https://api.clockly.es/billing/webhook
   stripe trigger checkout.session.completed
   # Verificar que plan_type cambia en /auth/me
   stripe trigger customer.subscription.deleted
   # Verificar degradación a FREE
   ```

3. **Confirmar entrega de email** — cierra HIGH-02:
   - Usar email real en un invite o password reset
   - Confirmar llegada en bandeja, no spam
   - Verificar enlace funcional

### Antes de lanzamiento público (próximas 2 semanas)
4. **~~Crear `/privacy` y `/terms`~~** → **HECHO** — placeholders serios en `frontend-next/app/privacy/page.tsx` y `frontend-next/app/terms/page.tsx`. Enlazados desde el footer del layout de autenticación. Pendientes revisión legal antes de uso con clientes reales.
5. **Cookie consent banner** (cookies necesarias exentas, pero documentar).
6. **Confirmar backups Neon** — habilitar PITR o branch automático.
7. **Runbook de deploy y rollback** en `docs/DEPLOY_FLY.md`.

---

---

## 19. Validación pre-commit (2026-05-19)

Antes del commit y deploy se ejecutaron las siguientes validaciones locales:

| Check | Resultado |
|-------|-----------|
| `tsc --noEmit` (type-check) | ✅ 0 errores |
| `eslint` (páginas nuevas + layout auth) | ✅ 0 errores |
| `next build` (producción) | ✅ Clean — `/privacy` y `/terms` compilados |
| Secretos en diff | ✅ Ninguno (solo placeholders en docs existentes) |
| Artefactos de build excluidos | ✅ `.next-rc/`, `tsconfig.json` auto-generated revertidos |
| `next-env.d.ts` auto-generated | ✅ Revertido, no incluido en commit |

Archivos incluidos en commit:
- `frontend-next/app/privacy/page.tsx` — Política de Privacidad RGPD
- `frontend-next/app/terms/page.tsx` — Términos y Condiciones (15 secciones)
- `frontend-next/app/(auth)/layout.tsx` — Footer con links "Privacidad · Términos"
- `frontend-next/e2e/auth.spec.ts` — Fix test stale (forgot-password)
- `frontend-next/package-lock.json` — Next.js 16.2.4 → 16.2.6 (cierra CVEs HIGH)
- `docs/release-candidate-validation.md` — Informe RC local completo
- `docs/staging-smoke-validation.md` — Este informe

*Informe generado: 2026-05-19 | Validación staging real contra api.clockly.es / app.clockly.es*
