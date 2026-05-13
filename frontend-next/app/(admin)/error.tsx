"use client";

import { RouteErrorFallback } from "@/components/shared/route-error-fallback";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="No se pudo cargar esta vista"
      description="La operacion fallo antes de completar el render. Reintenta la carga o vuelve al dashboard."
      homeHref="/dashboard"
      homeLabel="Ir al dashboard"
    />
  );
}
