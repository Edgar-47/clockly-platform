import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Recuperar acceso",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full rounded-xl border border-border bg-white p-7 shadow-md">
      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Recuperar acceso
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          El restablecimiento de contraseña se gestiona manualmente.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-surface-bg px-4 py-4 text-[13px] text-ink-muted">
        <p className="font-medium text-ink">¿Olvidaste tu contraseña?</p>
        <p>
          Contacta con el administrador de tu empresa para que restablezca tu acceso
          desde el panel de empleados.
        </p>
        <p>
          Si eres el administrador de la cuenta y no puedes acceder, escribe a
          soporte indicando tu empresa y email de registro.
        </p>
      </div>

      <div className="mt-5 text-center">
        <Link
          href="/login"
          className="text-[13px] font-medium text-primary hover:underline"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
