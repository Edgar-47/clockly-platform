"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-surface-bg px-4 py-10">
          <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-danger-border bg-danger-bg text-danger-DEFAULT">
              !
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              ClockLy no pudo arrancar correctamente
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Se ha producido un error inesperado antes de cargar la aplicacion.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex h-9 items-center justify-center rounded bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
