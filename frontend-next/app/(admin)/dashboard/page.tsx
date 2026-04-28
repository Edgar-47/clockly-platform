"use client";

import Link from "next/link";
import { MonitorSmartphone } from "lucide-react";
import { Topbar } from "@/components/shared/topbar";
import { Button } from "@/components/ui/button";
import { MetricsGrid } from "@/features/dashboard/components/metrics-grid";
import { ActiveEmployees } from "@/features/dashboard/components/active-employees";
import { RecentSessions } from "@/features/dashboard/components/recent-sessions";
import { useDashboard } from "@/hooks/use-dashboard";

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  return (
    <>
      <Topbar
        title="Dashboard"
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link href="/kiosk" target="_blank">
              <MonitorSmartphone className="h-4 w-4" />
              Abrir Kiosk
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-[13px] text-danger-DEFAULT">
            Error al cargar el dashboard. Comprueba la conexión con el backend.
          </div>
        )}

        {/* Company header */}
        {data?.business && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-ink leading-none">
                {data.business.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {data.usage && (
                  <span className="inline-flex items-center rounded-full bg-warning-bg border border-warning-border px-2.5 py-0.5 text-[11px] font-bold text-warning-DEFAULT uppercase tracking-wide">
                    Plan {data.usage.plan.name}
                  </span>
                )}
                {data.usage && (
                  <>
                    <span className="text-[13px] text-ink-xmuted">·</span>
                    <span className="text-[13px] text-ink-muted">
                      {data.usage.employee_count}/
                      {data.usage.plan.max_employees ?? "∞"} empleados
                    </span>
                  </>
                )}
                {data.business.timezone && (
                  <>
                    <span className="text-[13px] text-ink-xmuted">·</span>
                    <span className="text-[13px] text-ink-muted">
                      {data.business.timezone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <MetricsGrid data={data} loading={isLoading} />

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <RecentSessions
            sessions={data?.recent_sessions}
            loading={isLoading}
            companyTimeZone={data?.business?.timezone}
          />
          <ActiveEmployees
            statuses={data?.clocked_in_statuses}
            loading={isLoading}
          />
        </div>
      </div>
    </>
  );
}
