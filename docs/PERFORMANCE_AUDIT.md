# Performance Audit — ClockLy Platform

**Fecha:** 2026-05-21  
**Scope:** backend_v2/ + frontend-next/  
**Auditor:** Senior Full-Stack Performance Engineer (AI-assisted)

---

## Resumen ejecutivo

La aplicación tiene una base sólida (índices existentes, React Query, paginación), pero hay 5 problemas de alto impacto que afectan directamente a la latencia percibida por el usuario.

---

## 1. Problemas detectados

### 🔴 CRÍTICO

#### P-01 — Dashboard realiza doble llamada a `/auth/me`
| Campo | Detalle |
|---|---|
| **Archivo** | `frontend-next/services/dashboard.service.ts` línea 12, `frontend-next/hooks/use-auth.ts` línea 21 |
| **Problema** | `dashboardService.summary()` llama directamente a `api.get("/auth/me")` via fetch raw. Al mismo tiempo, `useSession()` (montado en el layout admin) también llama a `/auth/me` vía React Query. El dashboard en cada refresco (2 min) genera un extra HTTP request a `/auth/me` aunque la sesión esté cacheada. |
| **Impacto** | 1 llamada HTTP extra en CADA carga/refresco del dashboard. Con 100 admins activos = 100 × 30 req/hora = 3.000 req/hora innecesarias al backend. |
| **Solución** | Pasar la sesión ya cacheada de React Query a `dashboardService.summary()` para evitar el fetch redundante. |
| **Prioridad** | CRÍTICA |
| **Riesgo** | Bajo — solo cambia fuente de datos, no la lógica |
| **Mejora esperada** | -20% llamadas al endpoint `/auth/me` |

#### P-02 — Auth middleware: 2 queries por request (user + company)
| Campo | Detalle |
|---|---|
| **Archivo** | `backend_v2/app/dependencies/auth.py` líneas 64–66 |
| **Problema** | Cada request autenticado ejecuta dos SELECT independientes: `UserRepository.get_active()` y `CompanyRepository.get()`. Son 2 round-trips a la base de datos por cada petición. |
| **Impacto** | Con 1.000 req/min a la API → 2.000 queries/min solo para auth. En bases de datos remotas (Neon), cada round-trip puede costar 5–20 ms. |
| **Solución** | Usar `joinedload(User.company)` en `UserRepository` para traer usuario y empresa en un solo JOIN. |
| **Prioridad** | CRÍTICA |
| **Riesgo** | Medio — toca el flujo de auth central. Tests de auth deben verificar. |
| **Mejora esperada** | -50% queries de auth → -5-10 ms por request |

### 🟠 ALTA

#### P-03 — Índice compuesto faltante: `(company_id, status, clock_in)` en `attendance_sessions`
| Campo | Detalle |
|---|---|
| **Archivo** | `backend_v2/alembic/versions/` (migración nueva necesaria) |
| **Problema** | Las queries de analytics (`_daily_totals`), exports y métricas filtran simultáneamente por `company_id + status='closed' + clock_in >= date_from`. Actualmente existen índices separados en `(company_id, clock_in)` y `(company_id, status)` pero no un compuesto. PostgreSQL tiene que elegir uno u otro y hacer bitmap merge, menos eficiente. |
| **Impacto** | Las queries de analytics, exports y cálculo de nómina son hasta 3–5× más lentas de lo necesario en empresas con >10.000 sesiones. |
| **Solución** | Migración Alembic que añade `ix_attendance_sessions_company_status_clock_in` sobre `(company_id, status, clock_in)`. |
| **Prioridad** | ALTA |
| **Riesgo** | Muy bajo — añadir índice no modifica datos |
| **Mejora esperada** | Analytics y exports 2–5× más rápidos |

#### P-04 — Índice compuesto faltante: `(company_id, employee_id, clock_in)` en `attendance_sessions`
| Campo | Detalle |
|---|---|
| **Archivo** | `backend_v2/alembic/versions/` (misma migración) |
| **Problema** | Las queries de cálculo de salarios y exports por empleado filtran `company_id + employee_id + clock_in BETWEEN`. El índice existente `(company_id, employee_id)` no incluye `clock_in`, obligando a un scan adicional. |
| **Impacto** | Cálculos de salario por empleado y exports filtrados por empleado más lentos. |
| **Solución** | Añadir `ix_attendance_sessions_company_employee_clock_in` sobre `(company_id, employee_id, clock_in)`. |
| **Prioridad** | ALTA |
| **Riesgo** | Muy bajo |
| **Mejora esperada** | Queries de salary y export por empleado 2–4× más rápidas |

#### P-05 — `useAttendanceHistory` polling cada 30 segundos
| Campo | Detalle |
|---|---|
| **Archivo** | `frontend-next/hooks/use-attendance.ts` línea 33 |
| **Problema** | El hook de historial de fichajes tiene `refetchInterval: 30_000`. La página de fichajes es un listado histórico que raramente cambia en tiempo real. Cada 30 segundos el frontend hace un GET `/attendance/sessions` con parámetros. Para 50 admins activos = 100 req/min solo por el polling de historial. |
| **Impacto** | Carga de red y DB innecesaria. La invalidación explícita tras mutaciones ya refresca los datos. |
| **Solución** | Eliminar `refetchInterval` de `useAttendanceHistory`. Mantener `refetchOnWindowFocus: false` implícito en el staleTime. Para `useCurrentAttendance` (panel kiosk) el polling es correcto. |
| **Prioridad** | ALTA |
| **Riesgo** | Bajo — datos de historial no son tiempo real |
| **Mejora esperada** | -60% requests al endpoint `/attendance/sessions` |

### 🟡 MEDIA

#### P-06 — Filtros de sesiones sin debounce
| Campo | Detalle |
|---|---|
| **Archivo** | `frontend-next/features/attendance/components/sessions-table.tsx` línea 46 |
| **Problema** | Cada cambio en los inputs de fecha en `SessionsTable.applyFilter` dispara inmediatamente `onFilterChange` → nuevo `queryKey` → nueva query React Query → nueva llamada HTTP. Al escribir una fecha manualmente (8 caracteres) = hasta 8 llamadas HTTP. |
| **Impacto** | Rafaga de llamadas HTTP al backend al usar filtros de fecha en la página de fichajes. |
| **Solución** | Añadir debounce de 400ms en `applyFilter` para date inputs. Los selects (status, clock_out_source) pueden cambiar inmediatamente. |
| **Prioridad** | MEDIA |
| **Riesgo** | Bajo |
| **Mejora esperada** | Hasta 8× reducción de queries al filtrar por fecha |

#### P-07 — Analytics: `_employee_names()` carga todos los empleados aunque luego solo usa los involucrados
| Campo | Detalle |
|---|---|
| **Archivo** | `backend_v2/app/services/analytics_service.py` líneas 233–239 |
| **Problema** | `anomalies()` llama a `_employee_names()` que hace SELECT de TODOS los empleados de la empresa para construir un dict id→nombre. Las 3 queries de anomalías luego filtran un subconjunto. Para empresas con 200+ empleados, esto carga datos innecesarios. |
| **Impacto** | Carga de memoria y DB innecesaria en endpoint `/analytics/anomalies`. |
| **Solución** | Hacer JOIN con `Employee` directamente en las queries de anomalías para obtener solo los nombres necesarios. |
| **Prioridad** | MEDIA |
| **Riesgo** | Bajo — solo afecta analytics endpoint |
| **Mejora esperada** | Reducción de datos cargados en analytics |

#### P-08 — `gcTime` no configurado en queries de empleados y sesiones
| Campo | Detalle |
|---|---|
| **Archivo** | `frontend-next/hooks/use-employees.ts`, `frontend-next/hooks/use-attendance.ts` |
| **Problema** | El `gcTime` por defecto de React Query es 5 minutos. Los datos de empleados (muy estables) se eliminan del cache pasados 5 minutos de inactividad, causando re-fetch al volver a la página. |
| **Impacto** | Re-fetches innecesarios al navegar entre páginas tras 5 minutos. |
| **Solución** | Aumentar `gcTime` a 15 minutos para empleados (cambian poco), mantener default para sesiones. |
| **Prioridad** | MEDIA |
| **Riesgo** | Muy bajo |
| **Mejora esperada** | Menos re-fetches al navegar |

#### P-09 — Export service carga hasta 10.000 sesiones en memoria
| Campo | Detalle |
|---|---|
| **Archivo** | `backend_v2/app/services/export_service.py` línea 44 |
| **Problema** | `list_exportable_sessions` tiene `limit=10_000`. Para empresas con muchos empleados y rangos de fecha largos, esto puede cargar 10.000 registros en memoria de Python para construir XLSX/CSV. Sin streaming. |
| **Impacto** | Potencial consumo de RAM elevado, posibles timeouts en exports grandes. |
| **Solución** | Añadir límite razonable por defecto (5.000), documentar el límite, y considerar streaming para CSV en el futuro. |
| **Prioridad** | MEDIA |
| **Riesgo** | Bajo — cambio de límite no afecta lógica |
| **Mejora esperada** | Protección contra OOM en exports grandes |

### 🟢 BAJA

#### P-10 — `staleTime` de `useAttendanceHistory` (30s) inconsistente con refetchInterval eliminado
| Campo | Detalle |
|---|---|
| **Archivo** | `frontend-next/hooks/use-attendance.ts` |
| **Problema** | Con `refetchInterval` eliminado, los datos de historial se refrescan solo al navegar o al cambiar filters. El `staleTime: 30_000` es correcto — datos de 30s se consideran frescos. |
| **Impacto** | Menor — solo documentación |
| **Prioridad** | BAJA |

#### P-11 — `AttendanceRepository.list_sessions` + `count_sessions` son 2 queries separadas
| Campo | Detalle |
|---|---|
| **Archivo** | `backend_v2/app/repositories/attendance_repository.py` |
| **Problema** | El endpoint `/attendance/sessions` llama a `list_sessions` y `count_sessions` por separado. En PostgreSQL se puede usar `COUNT(*) OVER()` para obtener ambos en una sola query. |
| **Impacto** | Menor — ya existe índice óptimo. Ahorro de 1 round-trip por petición al endpoint de sesiones. |
| **Solución** | Añadir método `list_sessions_with_total` usando window function. Bajo riesgo pero complejidad adicional. |
| **Prioridad** | BAJA (relación esfuerzo/beneficio baja dado que los índices ya existen) |

---

## 2. Índices existentes confirmados

Los siguientes índices ya existen y son correctos:
- `ix_attendance_sessions_company_clock_in` — (company_id, clock_in)
- `ix_attendance_sessions_company_status` — (company_id, status)
- `ix_attendance_sessions_company_employee_id` — (company_id, employee_id)
- `uq_attendance_sessions_one_open_per_employee` — partial unique (status='open')
- `ix_late_arrivals_company_date` — (company_id, date)
- `ix_late_arrivals_company_employee` — (company_id, employee_id)
- `ix_late_arrivals_company_status` — (company_id, status)
- `ix_salary_profiles_company_employee` — (company_id, employee_id)
- `ix_salary_profiles_company_effective` — (company_id, effective_from, effective_to)
- `ix_employees_company_active` — (company_id, is_active)

**Faltan (a añadir):**
- `ix_attendance_sessions_company_status_clock_in` — (company_id, status, clock_in)
- `ix_attendance_sessions_company_employee_clock_in` — (company_id, employee_id, clock_in)

---

## 3. Tabla de prioridades

| ID | Área | Prioridad | Esfuerzo | Impacto |
|---|---|---|---|---|
| P-01 | Frontend: dashboard /auth/me doble | CRÍTICA | Bajo | Alto |
| P-02 | Backend: auth 2 queries → 1 JOIN | CRÍTICA | Medio | Alto |
| P-03 | DB: índice (company_id, status, clock_in) | ALTA | Muy bajo | Alto |
| P-04 | DB: índice (company_id, employee_id, clock_in) | ALTA | Muy bajo | Medio |
| P-05 | Frontend: polling 30s en historial | ALTA | Bajo | Alto |
| P-06 | Frontend: debounce filtros fecha | MEDIA | Bajo | Medio |
| P-07 | Backend: analytics _employee_names JOIN | MEDIA | Bajo | Bajo |
| P-08 | Frontend: gcTime empleados | MEDIA | Muy bajo | Bajo |
| P-09 | Backend: export limit 10K | MEDIA | Muy bajo | Bajo |
| P-10 | Frontend: staleTime doc | BAJA | — | — |
| P-11 | Backend: list+count window fn | BAJA | Medio | Bajo |
