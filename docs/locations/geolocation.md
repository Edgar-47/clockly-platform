# Módulo de Geolocalización — ClockLy

## Resumen

El módulo de Geolocalización permite a los administradores ver en un mapa desde dónde han fichado los empleados y verificar si lo hicieron desde el centro de trabajo.

**Decisión de privacidad clave:** La ubicación se captura únicamente en el momento puntual del fichaje (clock-in / clock-out). ClockLy **no realiza seguimiento continuo** de la posición de los empleados.

---

## Cómo activar la funcionalidad

### 1. Plan requerido
La gestión de centros de trabajo requiere el **plan Business** (`has_multi_location = true`). La visualización del mapa de asistencias usa el permiso `locations:read` disponible desde el plan Pro.

### 2. Configurar centros de trabajo
1. Ir al panel admin → **Centros de trabajo**.
2. Crear un nuevo centro con nombre, dirección, latitud/longitud y radio permitido (metros).
3. El botón **Usar mi ubicación actual** usa el GPS del navegador para rellenar las coordenadas.

### 3. Los empleados deben aceptar el permiso de ubicación
Cuando un empleado pulse "Entrada" o "Salida" en la web, el navegador solicitará el permiso de geolocalización. Si lo acepta, las coordenadas se envían junto al fichaje. Si lo rechaza, el fichaje se registra igualmente con `location_permission_status = denied`.

---

## Permisos necesarios (navegador)

| Contexto | Permiso |
|---|---|
| Fichaje web (empleado) | `navigator.geolocation` — solicitado en cada fichaje |
| Kiosk | No solicita ubicación (modo PIN compartido) |
| Backend/API | Sin requisito adicional |

El header de producción `Permissions-Policy: geolocation=(self)` permite el acceso desde el mismo origen.

---

## Endpoints nuevos

### Centros de trabajo (`/locations`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/locations` | `locations:read` | Lista centros (filtro inactive opcional) |
| POST | `/locations` | `locations:write` + plan Business | Crear centro |
| PATCH | `/locations/{id}` | `locations:write` | Actualizar centro |
| DELETE | `/locations/{id}` | `locations:write` | Soft-delete (desactiva, conserva historial) |

**Payload de creación:**
```json
{
  "name": "Oficina Central",
  "address": "Calle Gran Vía 1, Madrid",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "allowed_radius_meters": 200,
  "is_active": true
}
```

### Mapa de asistencias (`/attendance-locations`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/attendance-locations` | `locations:read` | Eventos de fichaje con coordenadas |
| GET | `/attendance-locations/latest` | `locations:read` | Última posición por empleado |
| GET | `/attendance-locations/summary` | `locations:read` | Estadísticas por periodo |

**Filtros de `/attendance-locations`:**
- `employee_id` — filtrar por empleado
- `date_from` / `date_to` — rango de fechas (ISO 8601)
- `location_status` — `in_range` | `out_of_range` | `unknown`
- `limit` / `offset` — paginación

### Fichaje con ubicación (`/attendance/clock-in` y `/attendance/clock-out`)

Los campos de ubicación son opcionales en ambos endpoints:

```json
{
  "method": "web",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "accuracy_meters": 15.3,
  "location_source": "browser",
  "location_permission_status": "granted"
}
```

---

## Modelo de datos

### `company_locations` (centros de trabajo)

| Campo | Tipo | Descripción |
|---|---|---|
| `latitude` | float nullable | Latitud del centro |
| `longitude` | float nullable | Longitud del centro |
| `allowed_radius_meters` | int (default 100) | Radio de geofencing |

### `attendance_sessions` (campos añadidos)

| Campo | Tipo | Descripción |
|---|---|---|
| `clock_in_latitude` | float nullable | Coordenada de entrada |
| `clock_in_longitude` | float nullable | Coordenada de entrada |
| `clock_in_accuracy_meters` | float nullable | Precisión GPS en entrada |
| `clock_in_location_status` | enum nullable | `in_range` / `out_of_range` / `unknown` |
| `clock_in_distance_meters` | float nullable | Distancia al centro más cercano |
| `clock_out_latitude` | float nullable | Coordenada de salida |
| `clock_out_longitude` | float nullable | Coordenada de salida |
| `clock_out_accuracy_meters` | float nullable | Precisión GPS en salida |
| `clock_out_location_status` | enum nullable | `in_range` / `out_of_range` / `unknown` |
| `clock_out_distance_meters` | float nullable | Distancia al centro más cercano |
| `location_source` | enum | `browser` / `mobile` / `kiosk` / `manual` / `unknown` |
| `location_permission_status` | enum | `granted` / `denied` / `unavailable` / `unknown` |

---

## Lógica de negocio

### Cálculo de distancia (Haversine)
`backend_v2/app/core/geo.py` implementa la fórmula Haversine para calcular la distancia entre dos puntos GPS en metros con precisión de ~0.5%.

### Evaluación de `location_status`
1. Si no hay coordenadas → `NULL` (sin datos de ubicación)
2. Si hay coordenadas pero no hay centros configurados → `unknown`
3. Si hay coordenadas y centros configurados → se busca el centro más cercano:
   - Distancia ≤ `allowed_radius_meters` → `in_range`
   - Distancia > `allowed_radius_meters` → `out_of_range`

### El fichaje nunca se bloquea por ubicación
`location_required` está preparado en el modelo pero no activo. Actualmente siempre se permite fichar independientemente de la ubicación.

---

## Limitaciones de privacidad

- **Solo ubicación puntual:** Se captura la posición únicamente cuando el empleado activa el fichaje. No hay actualizaciones periódicas ni seguimiento en background.
- **Consentimiento explícito:** El navegador solicita el permiso al usuario. Sin permiso, el fichaje se registra pero sin coordenadas.
- **Dato mínimo:** Solo se almacena lat/lon/accuracy del momento exacto del fichaje.
- **Retención:** Los datos de ubicación se conservan mientras exista la sesión de asistencia. Las políticas de retención generales de la empresa aplican igual.

---

## Preparación para funcionalidades futuras

Los siguientes campos/configuraciones están listos en el modelo para activarse sin migración:
- `location_required: bool` — obligar ubicación para fichar
- `allow_out_of_range_clock_in: bool` — bloquear fichajes fuera de rango
- `allowed_radius_meters` por centro — ya funcional

---

## Arquitectura de la decisión

**¿Por qué columnas en `attendance_sessions` y no tabla separada?**

- Evita joins adicionales en la query principal de fichajes.
- La granularidad puntual (solo clock-in/out) encaja con el modelo de sesión existente.
- Si se necesitan eventos intermedios (pausas, breaks) se puede crear `attendance_location_events` como extensión sin romper lo existente.

**¿Por qué Leaflet + OpenStreetMap?**

- Sin coste de API keys.
- Cobertura global con licencia ODbL.
- `react-leaflet` tiene soporte SSR controlado con `dynamic()` de Next.js.
