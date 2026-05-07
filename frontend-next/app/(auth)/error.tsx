"use client";

import { RouteErrorFallback } from "@/components/shared/route-error-fallback";

export default function AuthError({
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
      title="No se pudo cargar el acceso"
      description="El formulario no se ha podido preparar correctamente. Reintenta sin mostrar detalles sensibles."
      homeHref="/login"
      homeLabel="Volver al acceso"
    />
  );
}
