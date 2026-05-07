"use client";

import { RouteErrorFallback } from "@/components/shared/route-error-fallback";

export default function EmployeeError({
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
      title="No se pudo cargar tu portal"
      description="La vista de empleado encontro un error inesperado. Puedes reintentar sin perder la sesion actual."
      homeHref="/employee"
      homeLabel="Volver al portal"
    />
  );
}
