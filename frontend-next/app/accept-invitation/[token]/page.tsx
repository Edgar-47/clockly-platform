"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { membersService } from "@/services/members.service";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedEmail, setAcceptedEmail] = useState<string | null>(null);

  const preview = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => membersService.previewInvitation(token),
    enabled: Boolean(token),
    retry: false,
  });

  const acceptInvitation = useMutation({
    mutationFn: () => membersService.acceptInvitation(token, { full_name: fullName, password }),
    onSuccess: (response) => {
      setAcceptedEmail(response.invitation.email);
      toast.success("Invitacion aceptada.");
    },
    onError: (error: { detail?: string }) => {
      toast.error(error.detail ?? "La invitación no es válida o ha expirado.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    acceptInvitation.mutate();
  }

  const previewDescription = preview.data
    ? `Acceso a ${preview.data.company_name} como ${preview.data.role}.`
    : "Crea tu usuario para entrar en ClockLy.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-bg px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aceptar invitación</CardTitle>
            <CardDescription>{previewDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {acceptedEmail ? (
              <div className="space-y-5 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
                <div>
                  <p className="text-sm font-semibold text-ink">Cuenta creada para {acceptedEmail}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Ya puedes iniciar sesión con la contraseña que acabas de definir.
                  </p>
                </div>
                <Button type="button" className="w-full" onClick={() => router.replace("/login")}>
                  Ir al login
                </Button>
              </div>
            ) : preview.isLoading ? (
              <div className="rounded-md border border-border bg-surface-bg px-3.5 py-3 text-sm text-ink-muted">
                Validando invitación...
              </div>
            ) : preview.error || preview.data?.status !== "pending" ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger-DEFAULT">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>La invitación no es válida, ya fue usada o ha caducado.</span>
                </div>
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/login">Volver al login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {acceptInvitation.isError && (
                  <div className="rounded-md border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger-DEFAULT">
                    {(acceptInvitation.error as { detail?: string })?.detail ??
                      "No se pudo aceptar la invitación. Revisa el enlace o solicita una nueva."}
                  </div>
                )}

                <div className="rounded-md border border-border bg-surface-bg px-3.5 py-2.5 text-[13px] text-ink-muted">
                  Invitacion para <span className="font-semibold text-ink">{preview.data.email}</span>.
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="full-name">Nombre completo</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    minLength={1}
                    maxLength={160}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    maxLength={256}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" loading={acceptInvitation.isPending}>
                  Crear cuenta
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-ink-muted">
          Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
