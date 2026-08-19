"use client";

import { RouteErrorFallback } from "@/components/shared/route-error-fallback";

export default function AppError({
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
      title="No se pudo cargar la página"
      description="Ha ocurrido un error inesperado. Puedes reintentar la carga o volver a una zona estable de ClockLy."
      homeHref="/dashboard"
      homeLabel="Ir al dashboard"
    />
  );
}
