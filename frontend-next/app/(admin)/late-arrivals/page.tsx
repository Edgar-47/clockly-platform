"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/shared/topbar";
import { Button } from "@/components/ui/button";
import { LateArrivalFiltersBar } from "@/features/late-arrivals/components/late-arrival-filters";
import { LateArrivalStatsCards } from "@/features/late-arrivals/components/late-arrival-stats-cards";
import { LateArrivalCharts } from "@/features/late-arrivals/components/late-arrival-charts";
import { LateArrivalsTable } from "@/features/late-arrivals/components/late-arrivals-table";
import {
  useExportLateArrivals,
  useLateArrivalCharts,
  useLateArrivalStats,
  useLateArrivals,
  useUpdateLateArrivalStatus,
} from "@/hooks/use-late-arrivals";
import { useMe } from "@/hooks/use-auth";
import type { LateArrivalFilters } from "@/types/late-arrival";

const LIMIT = 50;

export default function LateArrivalsPage() {
  const { data: me } = useMe();
  const [filters, setFilters] = useState<LateArrivalFilters>({ limit: LIMIT, offset: 0 });
  const [showCharts, setShowCharts] = useState(false);

  const canManage = (me?.permissions ?? []).includes("late_arrivals:manage");
  const canExport = (me?.permissions ?? []).includes("late_arrivals:export");
  const isEmployee = me?.user.role === "employee";

  const statsFilters = {
    employee_id: filters.employee_id,
    date_from: filters.date_from,
    date_to: filters.date_to,
  };

  const { data: listData, isLoading } = useLateArrivals(filters);
  const { data: stats, isLoading: statsLoading } = useLateArrivalStats(statsFilters);
  const { data: charts, isLoading: chartsLoading } = useLateArrivalCharts(statsFilters);

  const updateStatus = useUpdateLateArrivalStatus();
  const exportRecords = useExportLateArrivals();

  function handleStatusChange(id: string, status: string, justification?: string) {
    updateStatus.mutate(
      {
        id,
        payload: {
          status: status as "pending" | "justified" | "unjustified" | "ignored",
          justification_text: justification ?? null,
        },
      },
      {
        onSuccess: () => toast.success("Estado actualizado."),
        onError: (err) => toast.error((err as Error).message ?? "No se pudo actualizar."),
      },
    );
  }

  function handleExport() {
    exportRecords.mutate(
      {
        employee_id: filters.employee_id,
        status: filters.status,
        date_from: filters.date_from,
        date_to: filters.date_to,
      },
      {
        onSuccess: () => toast.success("Exportación descargada."),
        onError: (err) => toast.error((err as Error).message ?? "Error al exportar."),
      },
    );
  }

  return (
    <>
      <Topbar title="Retrasos" />
      <div className="space-y-5 p-5 lg:p-6">

        {!isEmployee && (
          <LateArrivalStatsCards stats={stats} loading={statsLoading} />
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <LateArrivalFiltersBar filters={filters} onChange={setFilters} />
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCharts((v) => !v)}
            >
              {showCharts ? "Ocultar gráficos" : "Ver gráficos"}
            </Button>
            {canExport && (
              <Button
                variant="secondary"
                size="sm"
                loading={exportRecords.isPending}
                onClick={handleExport}
              >
                Exportar Excel
              </Button>
            )}
          </div>
        </div>

        {showCharts && !isEmployee && (
          <LateArrivalCharts charts={charts} loading={chartsLoading} />
        )}

        <LateArrivalsTable
          records={listData?.items}
          total={listData?.total}
          loading={isLoading}
          canManage={canManage && !isEmployee}
          onStatusChange={handleStatusChange}
          updatingId={updateStatus.isPending ? (updateStatus.variables as { id: string })?.id : null}
        />

        {listData && listData.total > LIMIT && (
          <div className="flex items-center justify-between text-[12px] text-ink-muted">
            <span>
              Mostrando {(filters.offset ?? 0) + 1}–
              {Math.min((filters.offset ?? 0) + LIMIT, listData.total)} de {listData.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={(filters.offset ?? 0) === 0}
                onClick={() =>
                  setFilters((f) => ({ ...f, offset: Math.max(0, (f.offset ?? 0) - LIMIT) }))
                }
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={(filters.offset ?? 0) + LIMIT >= listData.total}
                onClick={() =>
                  setFilters((f) => ({ ...f, offset: (f.offset ?? 0) + LIMIT }))
                }
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
