"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { useAdminSession } from "@/hooks/use-auth";
import { useOnboardingStatus } from "@/hooks/use-onboarding";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const session = useAdminSession();
  const pathname = usePathname();
  const router = useRouter();

  // Only owner/admin roles need to complete onboarding before accessing the app.
  // Managers and below skip directly to their views.
  const isOwnerOrAdmin =
    session.data?.user.role === "owner" || session.data?.user.role === "admin";
  const onboarding = useOnboardingStatus();

  useEffect(() => {
    if (!isOwnerOrAdmin) return;
    if (!onboarding.data) return;
    const isComplete = onboarding.data.onboarding_step === "complete";
    const isOnOnboarding = pathname === "/onboarding";
    if (!isComplete && !isOnOnboarding) {
      router.replace("/onboarding");
    }
  }, [isOwnerOrAdmin, onboarding.data, pathname, router]);

  if (session.isLoading || (isOwnerOrAdmin && onboarding.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session.error && session.error.status !== 401) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg p-6">
        <div className="max-w-md rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-DEFAULT">
          No se pudo validar la sesion administrativa. Revisa la conexion con el backend.
        </div>
      </div>
    );
  }

  if (!session.data || session.data.user.role === "employee") return null;

  if (session.data.user.role === "superadmin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg p-6">
        <div className="max-w-md rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-DEFAULT">
          Superadmin queda reservado para una consola interna futura y no puede entrar al dashboard tenant.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-surface-bg">
        <Sidebar />
        {/* On mobile: no left padding (sidebar is a drawer overlay).
            On desktop (lg+): push content right by sidebar width. */}
        <div className="flex-1 min-w-0 lg:pl-[248px]">
          <main className="min-h-screen">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
