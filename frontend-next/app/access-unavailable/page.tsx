"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogout, useMe } from "@/hooks/use-auth";

export default function AccessUnavailablePage() {
  const { data } = useMe();
  const logout = useLogout();
  const isSuperadmin = data?.user.role === "superadmin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-bg px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-warning-bg text-warning-DEFAULT">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <CardTitle>Acceso no disponible</CardTitle>
            <CardDescription>
              {isSuperadmin
                ? "El rol superadmin está reservado para una consola interna futura."
                : "Tu rol no tiene acceso a esta zona de ClockLy."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button type="button" onClick={() => logout.mutate()} loading={logout.isPending}>
              Cerrar sesión
            </Button>
            {!isSuperadmin && (
              <Button asChild variant="secondary">
                <Link href="/dashboard">Volver al panel</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
