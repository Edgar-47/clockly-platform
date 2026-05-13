import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <div className="w-full rounded-xl border border-border bg-white p-7 shadow-md">
      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Acceder al panel
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Inicia sesión con el email de acceso del negocio.
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

      <div className="mt-4 flex items-center justify-between gap-3 text-[13px]">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Olvide mi contrasena
        </Link>
        <Link href="/register-company" className="font-medium text-primary hover:underline">
          Crear empresa
        </Link>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-surface-bg px-4 py-3 text-[12px] text-ink-muted">
        El kiosk se abre desde una sesión admin activa y valida el PIN de 4 dígitos de cada empleado.
      </div>
    </div>
  );
}
