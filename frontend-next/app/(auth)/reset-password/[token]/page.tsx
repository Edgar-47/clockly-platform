"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const resetPassword = useMutation({
    mutationFn: () => authService.resetPassword({ token, password }),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Las contraseñas no coinciden.");
      return;
    }
    resetPassword.mutate();
  }

  return (
    <div className="w-full rounded-xl border border-border bg-white p-7 shadow-md">
      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Cambiar contraseña
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Define una nueva contraseña para tu cuenta.
        </p>
      </div>

      {resetPassword.isSuccess ? (
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <div>
            <p className="text-sm font-semibold text-ink">Contraseña actualizada</p>
            <p className="mt-1 text-sm text-ink-muted">
              Ya puedes iniciar sesión con la nueva contraseña.
            </p>
          </div>
          <Button type="button" className="w-full" onClick={() => router.replace("/login")}>
            Ir al login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {(localError || resetPassword.error) && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger-DEFAULT">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span className="text-[13px]">
                {localError ??
                  (resetPassword.error as { detail?: string })?.detail ??
                  "El enlace no es valido o ha caducado."}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-[13px]">Nueva contraseña</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-[13px]">Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" className="w-full" size="lg" loading={resetPassword.isPending}>
            Guardar contraseña
          </Button>
        </form>
      )}

      <div className="mt-5 text-center">
        <Link href="/login" className="text-[13px] font-medium text-primary hover:underline">
          Volver al login
        </Link>
      </div>
    </div>
  );
}
