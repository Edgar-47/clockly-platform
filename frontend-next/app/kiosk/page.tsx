"use client";

import Link from "next/link";
import { Settings, Users } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ClockDisplay } from "@/features/kiosk/components/clock-display";
import { EmployeeGrid } from "@/features/kiosk/components/employee-grid";
import { PinPanel } from "@/features/kiosk/components/pin-panel";
import { SuccessScreen } from "@/features/kiosk/components/success-screen";
import { useKioskStore } from "@/features/kiosk/kiosk.store";
import { useCurrentAttendance } from "@/hooks/use-attendance";
import { useAdminSession } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function KioskPage() {
  const session = useAdminSession();
  const { data: statuses, isLoading } = useCurrentAttendance();
  const step = useKioskStore((s) => s.step);
  const kioskStatuses =
    statuses?.filter((status) => status.employee.has_pin) ?? [];

  if (session.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F7]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#FF6B35] border-t-transparent" />
      </div>
    );
  }

  if (session.error && session.error.status !== 401) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F7] p-6">
        <div className="max-w-md rounded-3xl border border-[#FF3B30]/20 bg-white px-6 py-5 text-sm text-[#FF3B30] shadow-sm">
          No se pudo abrir el kiosk. Revisa la sesión administrativa y la
          conexión con el backend.
        </div>
      </div>
    );
  }

  if (!session.data) return null;

  const clockedIn = kioskStatuses.filter((s) => s.is_clocked_in).length;
  const total = kioskStatuses.length;

  return (
    <div className="flex min-h-screen flex-col bg-[#F2F2F7]">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-black/[0.06] px-5 py-4 sm:px-8 sm:py-5">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          {/* Stats pill */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-[#F2F2F7] border border-black/[0.06] px-4 py-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#636366] sm:text-[12px]">
              <Users className="h-3.5 w-3.5" />
              <span>{total} empleados</span>
            </div>
            {clockedIn > 0 && (
              <>
                <span className="h-3.5 w-px bg-black/10" />
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#34C759] sm:text-[12px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34C759] animate-pulse-dot" />
                  <span>{clockedIn} fichados</span>
                </div>
              </>
            )}
          </div>
          {/* Settings link */}
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F2F7] border border-black/[0.06] text-[#8E8E93] hover:bg-[#E5E5EA] hover:text-[#1C1C1E] transition-colors sm:h-10 sm:w-10"
            title="Volver al panel"
          >
            <Settings className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-1 flex-col items-center gap-8 px-5 py-10 sm:gap-12 sm:px-8 sm:py-16">
        <ClockDisplay />

        {step === "grid" && (
          <div className="w-full max-w-5xl animate-fade-in">
            <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#AEAEB2] sm:mb-8">
              Toca tu nombre para fichar
            </p>

            {isLoading && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-40 rounded-3xl bg-white border border-black/[0.06] shadow-sm sm:h-48"
                  />
                ))}
              </div>
            )}

            {!isLoading && kioskStatuses.length === 0 && (
              <div className="rounded-3xl border border-black/[0.06] bg-white p-12 text-center shadow-sm">
                <p className="text-[14px] text-[#8E8E93]">
                  No hay empleados activos con PIN de kiosk configurado.
                </p>
                <Link
                  href="/employees/new"
                  className="mt-4 inline-block text-[13px] font-semibold text-[#FF6B35] hover:text-[#FF8C5A] transition-colors"
                >
                  Crear primer empleado →
                </Link>
              </div>
            )}

            {!isLoading && kioskStatuses.length > 0 && (
              <EmployeeGrid statuses={kioskStatuses} />
            )}
          </div>
        )}

        {step === "pin" && (
          <div className="w-full max-w-[300px] sm:max-w-[320px]">
            <PinPanel />
          </div>
        )}

        {step === "success" && (
          <div className="w-full max-w-sm">
            <SuccessScreen />
          </div>
        )}
      </main>
    </div>
  );
}
