"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const requestReset = useMutation({
    mutationFn: () => authService.requestPasswordReset({ email }),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestReset.mutate();
  }

  return (
    <div className="w-full rounded-xl border border-border bg-white p-7 shadow-md">
      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Recuperar acceso
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Te enviaremos un enlace seguro si el email existe.
        </p>
      </div>

      {requestReset.isSuccess ? (
        <div className="space-y-4 rounded-lg border border-success-border bg-success-bg px-4 py-4 text-[13px] text-success-DEFAULT">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Email enviado
          </div>
          <p>
            Si la dirección está registrada, recibirás un enlace para cambiar tu contraseña.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {requestReset.error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger-DEFAULT">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span className="text-[13px]">
                {(requestReset.error as { detail?: string })?.detail ?? "No se pudo solicitar el reset."}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reset-email" className="text-[13px]">Email de acceso</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <Button type="submit" className="w-full" size="lg" loading={requestReset.isPending}>
            Enviar enlace
          </Button>
        </form>
      )}

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
