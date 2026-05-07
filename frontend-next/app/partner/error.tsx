"use client";

import { RouteErrorFallback } from "@/components/shared/route-error-fallback";

export default function PartnerError({
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
      title="No se pudo cargar partners"
      description="La vista de partners fallo durante la carga. Reintenta o vuelve al panel principal."
      homeHref="/dashboard"
      homeLabel="Ir al dashboard"
    />
  );
}
