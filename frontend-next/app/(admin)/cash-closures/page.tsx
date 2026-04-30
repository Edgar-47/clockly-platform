"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/shared/topbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CashClosureDashboard } from "@/features/cash-closures/components/cash-closure-dashboard";
import { CashClosureFiltersBar } from "@/features/cash-closures/components/cash-closure-filters";
import { CashClosureForm } from "@/features/cash-closures/components/cash-closure-form";
import { CashClosuresTable } from "@/features/cash-closures/components/cash-closures-table";
import { useMe } from "@/hooks/use-auth";
import {
  useCashClosureCharts,
  useCashClosures,
  useCashClosureStats,
  useCreateCashClosure,
  useExportCashClosures,
  useUpdateCashClosure,
} from "@/hooks/use-cash-closures";
import { useEmployees } from "@/hooks/use-employees";
import { useWorkLocations } from "@/hooks/use-locations";
import type {
  CashClosure,
  CashClosureAnalyticsFilters,
  CashClosureCreateRequest,
  CashClosureFilters,
} from "@/types/cash-closure";

const LIMIT = 50;

type Tab = "new" | "stats" | "history";
type PageFilters = CashClosureFilters & CashClosureAnalyticsFilters;

export default function CashClosuresPage() {
  const { data: me } = useMe();
  const [tab, setTab] = useState<Tab>("new");
  const [editing, setEditing] = useState<CashClosure | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [filters, setFilters] = useState<PageFilters>({
    limit: LIMIT,
    offset: 0,
    payment_type: "all",
    period: "day",
  });

  const permissions = me?.permissions ?? [];
  const canRead = permissions.includes("cash_closures:read");
  const canCreate = permissions.includes("cash_closures:write");
  const canManage = permissions.includes("cash_closures:manage");
  const canAnalytics = permissions.includes("cash_closures:analytics");
  const canExport = permissions.includes("cash_closures:export");

  const { data: employees = [] } = useEmployees(canRead || canCreate || canAnalytics);
  const { data: locations = [] } = useWorkLocations(false, canRead || canCreate || canAnalytics);

  const listFilters = useMemo<CashClosureFilters>(
    () => ({
      date_from: filters.date_from,
      date_to: filters.date_to,
      shift: filters.shift,
      closed_by_user_id: filters.closed_by_user_id,
      location_id: filters.location_id,
      has_incidence: filters.has_incidence,
      limit: filters.limit,
      offset: filters.offset,
    }),
    [filters],
  );

  const analyticsFilters = useMemo<CashClosureAnalyticsFilters>(
    () => ({
      date_from: filters.date_from,
      date_to: filters.date_to,
      shift: filters.shift,
      closed_by_user_id: filters.closed_by_user_id,
      location_id: filters.location_id,
      payment_type: filters.payment_type,
      period: filters.period,
    }),
    [filters],
  );

  const { data: listData, isLoading: listLoading } = useCashClosures(listFilters, canRead);
  const { data: stats, isLoading: statsLoading } = useCashClosureStats(analyticsFilters, canAnalytics);
  const { data: charts, isLoading: chartsLoading } = useCashClosureCharts(analyticsFilters, canAnalytics);

  const createClosure = useCreateCashClosure();
  const updateClosure = useUpdateCashClosure();
  const exportClosures = useExportCashClosures();

  function handleCreate(payload: CashClosureCreateRequest) {
    createClosure.mutate(payload, {
      onSuccess: () => {
        toast.success("Cierre de caja registrado.");
        setFormKey((value) => value + 1);
        setTab("history");
      },
      onError: (err) => toast.error((err as Error).message ?? "No se pudo cerrar caja."),
    });
  }

  function handleUpdate(payload: CashClosureCreateRequest) {
    if (!editing) return;
    updateClosure.mutate(
      { id: editing.id, payload },
      {
        onSuccess: () => {
          toast.success("Cierre actualizado.");
          setEditing(null);
        },
        onError: (err) => toast.error((err as Error).message ?? "No se pudo actualizar."),
      },
    );
  }

  function handleExport(format: "xlsx" | "csv") {
    exportClosures.mutate(
      { ...listFilters, format },
      {
        onSuccess: () => toast.success(format === "xlsx" ? "Excel descargado." : "CSV descargado."),
        onError: (err) => toast.error((err as Error).message ?? "Error al exportar."),
      },
    );
  }

  if (!canRead && !canCreate && !canAnalytics) {
    return (
      <>
        <Topbar title="Cierre de caja" />
        <div className="p-6">
          <div className="rounded-lg border border-border bg-white p-6 text-[13px] text-ink-muted">
            No tienes acceso a cierres de caja.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Cierre de caja" />
      <div className="space-y-5 p-5 lg:p-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-white p-1 shadow-xs">
            {canCreate && (
              <button
                type="button"
                onClick={() => setTab("new")}
                className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  tab === "new" ? "bg-primary text-white" : "text-ink-muted hover:bg-surface-bg hover:text-ink"
                }`}
              >
                Nuevo cierre
              </button>
            )}
            {canAnalytics && (
              <button
                type="button"
                onClick={() => setTab("stats")}
                className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  tab === "stats" ? "bg-primary text-white" : "text-ink-muted hover:bg-surface-bg hover:text-ink"
                }`}
              >
                Estadisticas
              </button>
            )}
            {canRead && (
              <button
                type="button"
                onClick={() => setTab("history")}
                className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  tab === "history" ? "bg-primary text-white" : "text-ink-muted hover:bg-surface-bg hover:text-ink"
                }`}
              >
                Historial
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 xl:items-end">
            <CashClosureFiltersBar
              filters={filters}
              employees={employees}
              locations={locations}
              showAnalyticsFilters={tab === "stats"}
              onChange={setFilters}
            />
            {canExport && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={exportClosures.isPending && exportClosures.variables?.format === "xlsx"}
                  onClick={() => handleExport("xlsx")}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={exportClosures.isPending && exportClosures.variables?.format === "csv"}
                  onClick={() => handleExport("csv")}
                >
                  <FileText className="h-3.5 w-3.5" />
                  CSV
                </Button>
              </div>
            )}
          </div>
        </div>

        {tab === "new" && canCreate && (
          <CashClosureForm
            key={formKey}
            locations={locations}
            currentUserName={me?.user.full_name ?? ""}
            loading={createClosure.isPending}
            submitLabel="Cerrar caja"
            onSubmit={handleCreate}
          />
        )}

        {tab === "stats" && canAnalytics && (
          <CashClosureDashboard
            stats={stats}
            charts={charts}
            loading={statsLoading || chartsLoading}
          />
        )}

        {tab === "history" && canRead && (
          <>
            <div className="flex justify-end">
              {canCreate && (
                <Button type="button" size="sm" onClick={() => setTab("new")}>
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo cierre
                </Button>
              )}
            </div>
            <CashClosuresTable
              closures={listData?.items}
              total={listData?.total}
              loading={listLoading}
              canManage={canManage}
              onEdit={setEditing}
            />
            {listData && listData.total > LIMIT && (
              <div className="flex items-center justify-between text-[12px] text-ink-muted">
                <span>
                  Mostrando {(filters.offset ?? 0) + 1}-
                  {Math.min((filters.offset ?? 0) + LIMIT, listData.total)} de {listData.total}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={(filters.offset ?? 0) === 0}
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        offset: Math.max(0, (current.offset ?? 0) - LIMIT),
                      }))
                    }
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={(filters.offset ?? 0) + LIMIT >= listData.total}
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        offset: (current.offset ?? 0) + LIMIT,
                      }))
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cierre bloqueado</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4">
            {editing && (
              <CashClosureForm
                initialClosure={editing}
                locations={locations}
                currentUserName={me?.user.full_name ?? ""}
                loading={updateClosure.isPending}
                submitLabel="Guardar cambios"
                onSubmit={handleUpdate}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
