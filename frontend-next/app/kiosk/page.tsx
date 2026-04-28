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
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#FF6B35] border-t-transparent" />
      </div>
    );
  }

  if (session.error && session.error.status !== 401) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">
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
    <div className="flex min-h-screen flex-col bg-[#F5F5F7]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          {/* Stats pill */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2">
            <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <Users className="h-3.5 w-3.5" />
              <span>{total} empleados</span>
            </div>
            {clockedIn > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                  <span>{clockedIn} fichados</span>
                </div>
              </>
            )}
          </div>
          {/* Settings link */}
          <Link
            href="/dashboard"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Volver al panel"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-1 flex-col items-center px-6 py-12 gap-10">
        <ClockDisplay />

        {step === "grid" && (
          <div className="w-full max-w-5xl animate-fade-in">
            <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Selecciona tu nombre para fichar
            </p>

            {isLoading && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-44 rounded-2xl bg-slate-200 border-0"
                  />
                ))}
              </div>
            )}

            {!isLoading && kioskStatuses.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-[14px] text-slate-500">
                  No hay empleados activos con PIN de kiosk configurado.
                </p>
                <Link
                  href="/employees/new"
                  className="mt-4 inline-block text-[13px] text-[#FF6B35] hover:text-[#FF8C5A] transition-colors"
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
          <div className="w-full max-w-[320px]">
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
