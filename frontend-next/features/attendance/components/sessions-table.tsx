"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatSeconds } from "@/lib/format";
import type { SessionReport, AttendanceHistoryFilters } from "@/types/attendance";
import { attendanceService } from "@/services/attendance.service";

interface SessionsTableProps {
  sessions?: SessionReport[];
  loading?: boolean;
  onFilterChange: (filters: AttendanceHistoryFilters) => void;
  canExport?: boolean;
  canUseAdvancedFilters?: boolean;
}

const INCIDENT_LABELS: Record<string, string> = {
  late_arrival: "Llegada tarde",
  early_departure: "Salida anticipada",
  absence: "Ausencia",
  overtime: "Horas extra",
};

export function SessionsTable({
  sessions,
  loading,
  onFilterChange,
  canExport = false,
  canUseAdvancedFilters = false,
}: SessionsTableProps) {
  const [filters, setFilters] = useState<AttendanceHistoryFilters>({});
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const applyFilter = (update: Partial<AttendanceHistoryFilters>) => {
    if (!canUseAdvancedFilters && (update.date_from || update.date_to || update.employee_id)) {
      return;
    }
    const next = { ...filters, ...update };
    setFilters(next);
    onFilterChange(next);
  };

  const handleExport = async (format: "excel" | "pdf") => {
    if (!canExport) return;
    try {
      setExporting(format);
      const { blob, filename } = await attendanceService.downloadExport(format, filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? `clockly-attendance.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error((error as { detail?: string })?.detail ?? "No se pudo generar la exportacion.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-white shadow-xs">
      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 border-b border-border px-5 py-3.5">
        {(!canUseAdvancedFilters || !canExport) && (
          <Badge variant="warning">Disponible en Pro</Badge>
        )}
        <Input
          type="date"
          className="w-auto"
          disabled={!canUseAdvancedFilters}
          title={!canUseAdvancedFilters ? "Disponible en Pro" : undefined}
          onChange={(e) => applyFilter({ date_from: e.target.value || undefined })}
        />
        <Input
          type="date"
          className="w-auto"
          disabled={!canUseAdvancedFilters}
          title={!canUseAdvancedFilters ? "Disponible en Pro" : undefined}
          onChange={(e) => applyFilter({ date_to: e.target.value || undefined })}
        />
        <Select
          onValueChange={(v) =>
            applyFilter({
              status: v === "all" ? undefined : v === "open" ? "open" : "closed",
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Activas</SelectItem>
            <SelectItem value="closed">Cerradas</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!canExport}
            loading={exporting === "excel"}
            title={!canExport ? "Disponible en Pro" : undefined}
            onClick={() => handleExport("excel")}
          >
            Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!canExport}
            loading={exporting === "pdf"}
            title={!canExport ? "Disponible en Pro" : undefined}
            onClick={() => handleExport("pdf")}
          >
            PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left">
              {["Empleado", "Entrada", "Salida", "Duración", "Incidencia", "Estado"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-3">
                      <Skeleton className="h-3.5 w-20" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && (!sessions || sessions.length === 0) && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-ink-muted"
                >
                  No hay fichajes con los filtros seleccionados.
                </td>
              </tr>
            )}

            {!loading &&
              sessions?.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-surface-muted/50 transition-colors"
                >
                  <td className="px-5 py-3 text-[13px] font-medium text-ink">
                    {s.employee?.full_name ?? s.employee_name ?? `Empleado ${s.employee_id.slice(0, 8)}`}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted tabular-nums">
                    {formatDateTime(s.clock_in_time)}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted tabular-nums">
                    {s.clock_out_time ? formatDateTime(s.clock_out_time) : "—"}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted tabular-nums">
                    {s.total_seconds ? formatSeconds(s.total_seconds) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {s.incident_type ? (
                      <Badge variant="warning">
                        {INCIDENT_LABELS[s.incident_type] ?? s.incident_type}
                      </Badge>
                    ) : (
                      <span className="text-ink-xmuted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {s.is_active ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="muted">Cerrado</Badge>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && sessions && (
        <div className="border-t border-border px-5 py-3 text-[12px] text-ink-muted">
          {sessions.length} registro{sessions.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
