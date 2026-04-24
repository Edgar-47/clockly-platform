# ClockLy Frontend Next

`frontend-next/` es el frontend web real de ClockLy. No convive con un
frontend Jinja ni con otra SPA activa dentro de este repo.

## Architecture Source of Truth

- Next.js App Router es la unica capa web visible al usuario.
- La sesion vive en cookies HttpOnly emitidas por `backend_v2`.
- El frontend usa `GET /auth/me` como fuente de verdad del usuario actual.
- No se guardan tokens en `localStorage`.
- El proxy de Next solo hace el gate inicial por presencia de cookie; la
  autorizacion real se resuelve con la sesion del backend.

## Rutas activas

### Publicas

- `/`
- `/login`

### Admin

- `/dashboard`
- `/employees`
- `/sessions`
- `/analytics`
- `/tickets`
- `/settings`
- `/kiosk`

### Employee

- `/employee`

## Rutas retiradas del flujo principal

Estas rutas existen solo para redirigir fuera de superficies no listas:

- `/forgot-password`
- `/expenses`
- `/businesses`
- `/schedules`
- `/superadmin`

## Arranque

```powershell
npm install
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8010"
npm run dev
```

## Validacion

```powershell
npm run type-check
```

## Notas operativas

- El kiosk ya no es una demo publica: requiere sesion admin activa.
- Solo aparecen en el kiosk empleados activos con PIN configurado.
- Las exportaciones, metricas, tickets y fichajes dependen de endpoints reales
  del backend.
- Si una superficie no tiene backend y flujo completo, debe permanecer fuera de
  la navegacion principal.
