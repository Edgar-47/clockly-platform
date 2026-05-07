"use client";

import { RouteErrorFallback } from "@/components/shared/route-error-fallback";

export default function InvitationError({
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
      title="No se pudo cargar la invitacion"
      description="La invitacion no se pudo preparar correctamente. Reintenta o solicita un nuevo enlace al administrador."
      homeHref="/login"
      homeLabel="Ir al acceso"
    />
  );
}
