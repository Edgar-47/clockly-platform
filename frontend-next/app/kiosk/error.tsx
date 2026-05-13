"use client";

import { RouteErrorFallback } from "@/components/shared/route-error-fallback";

export default function KioskError({
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
      title="No se pudo cargar el kiosk"
      description="El modo kiosk no termino de iniciarse. Reintenta antes de entregar el dispositivo."
      homeHref="/dashboard"
      homeLabel="Ir al dashboard"
    />
  );
}
