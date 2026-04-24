import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesiÃ³n",
};

export default function LoginPage() {
  return (
    <div className="w-full rounded-xl border border-border bg-white p-7 shadow-md">
      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Acceder al panel
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Inicia sesiÃ³n con el email real de acceso del negocio.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-surface-bg px-4 py-6 text-center text-[13px] text-ink-muted">
            Cargando acceso...
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      <div className="mt-5 rounded-lg border border-border bg-surface-bg px-4 py-3 text-[12px] text-ink-muted">
        El kiosk se abre desde una sesiÃ³n admin activa y valida el PIN de 4 dÃ­gitos de cada empleado.
      </div>
    </div>
  );
}
