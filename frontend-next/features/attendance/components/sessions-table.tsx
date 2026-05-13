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
import { useAutoCloseOpenSessions, useUpdateAttendanceSession } from "@/hooks/use-attendance";

interface SessionsTableProps {
  sessions?: SessionReport[];
  loading?: boolean;
  onFilterChange: (filters: AttendanceHistoryFilters) => void;
  canExport?: boolean;
  canUseAdvancedFilters?: boolean;
  companyTimeZone?: string;
}

export function SessionsTable({
  sessions,
  loading,
  onFilterChange,
  canExport = false,
  canUseAdvancedFilters = false,
  companyTimeZone,
}: SessionsTableProps) {
  const [filters, setFilters] = useState<AttendanceHistoryFilters>({});
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [editing, setEditing] = useState<SessionReport | null>(null);
  const [editValues, setEditValues] = useState({ clock_in: "", clock_out: "", notes: "" });
  const updateSession = useUpdateAttendanceSession();
  const autoClose = useAutoCloseOpenSessions();

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
      toast.error((error as Error).message ?? "No se pudo generar la exportacion.");
    } finally {
      setExporting(null);
    }
  };

  const startEdit = (session: SessionReport) => {
    setEditing(session);
    setEditValues({
      clock_in: session.clock_in_time.slice(0, 16),
      clock_out: session.clock_out_time ? session.clock_out_time.slice(0, 16) : "",
      notes: session.notes ?? "",
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    updateSession.mutate(
      {
        id: editing.id,
        payload: {
          clock_in: editValues.clock_in,
          clock_out: editValues.clock_out || null,
          notes: editValues.notes || null,
          mark_corrected: true,
        },
      },
      {
        onSuccess: () => {
          toast.success("Fichaje corregido.");
          setEditing(null);
        },
        onError: (error) => toast.error((error as Error).message ?? "No se pudo corregir el fichaje."),
      },
    );
  };

  const closeOpenSessions = () => {
    autoClose.mutate(
      { older_than_hours: 16, notes: "Cierre automatico desde panel admin." },
      {
        onSuccess: (result) => toast.success(`${result.closed_count} sesiones cerradas.`),
        onError: (error) => toast.error((error as Error).message ?? "No se pudieron cerrar sesiones."),
      },
    );
  };

  return (
    <div className="rounded-lg border border-border bg-white shadow-xs">
      {/* ── FILTER BAR ─────────────────────────────────── */}
      <div className="border-b border-border px-4 py-3 sm:px-5">
        {(!canUseAdvancedFilters || !canExport) && (
          <div className="mb-2.5">
            <Badge variant="warning">Disponible en Pro</Badge>
          </div>
        )}
        {/* Stacked on mobile, inline on sm+ */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            type="date"
            className="w-full sm:w-auto"
            disabled={!canUseAdvancedFilters}
            title={!canUseAdvancedFilters ? "Disponible en Pro" : undefined}
            onChange={(event) => applyFilter({ date_from: event.target.value || undefined })}
          />
          <Input
            type="date"
            className="w-full sm:w-auto"
            disabled={!canUseAdvancedFilters}
            title={!canUseAdvancedFilters ? "Disponible en Pro" : undefined}
            onChange={(event) => applyFilter({ date_to: event.target.value || undefined })}
          />
          <Select
            onValueChange={(value) =>
              applyFilter({
                status: value === "all" ? undefined : value === "open" ? "open" : "closed",
              })
            }
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Activas</SelectItem>
              <SelectItem value="closed">Cerradas</SelectItem>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) =>
              applyFilter({
                clock_out_source: value === "all" ? undefined : value as AttendanceHistoryFilters["clock_out_source"],
              })
            }
          >
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="Tipo de cierre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="employee">Normal</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="auto">Automatico</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button variant="ghost" size="sm" loading={autoClose.isPending} onClick={closeOpenSessions}>
              Cerrar abiertas
            </Button>
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
      </div>

      {/* Edit form */}
      {editing && (
        <div className="grid gap-3 border-b border-border bg-surface-bg px-4 py-4 sm:px-5 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-ink-muted">Entrada</label>
            <Input
              type="datetime-local"
              value={editValues.clock_in}
              onChange={(event) => setEditValues((current) => ({ ...current, clock_in: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-ink-muted">Salida</label>
            <Input
              type="datetime-local"
              value={editValues.clock_out}
              onChange={(event) => setEditValues((current) => ({ ...current, clock_out: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-ink-muted">Notas</label>
            <Input
              value={editValues.notes}
              onChange={(event) => setEditValues((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Motivo de la correccion"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={updateSession.isPending} onClick={saveEdit}>
              Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* ── MOBILE CARD LIST (< md) ─────────────────────── */}
      <div className="divide-y divide-border md:hidden">
        {loading &&
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2 px-4 py-3.5">
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-3">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}

        {!loading && (!sessions || sessions.length === 0) && (
          <div className="px-4 py-10 text-center text-sm text-ink-muted">
            No hay fichajes con los filtros seleccionados.
          </div>
        )}

        {!loading &&
          sessions?.map((session) => (
            <div key={session.id} className="space-y-2 px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink">
                  {session.employee?.full_name ?? session.employee_name ?? `Empleado ${session.employee_id.slice(0, 8)}`}
                </p>
                <Button size="sm" variant="ghost" onClick={() => startEdit(session)} className="h-7 px-2 flex-shrink-0">
                  Editar
                </Button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-muted tabular-nums">
                <span>↓ {formatDateTime(session.clock_in_time, companyTimeZone)}</span>
                {session.clock_out_time && (
                  <span>↑ {formatDateTime(session.clock_out_time, companyTimeZone)}</span>
                )}
                {session.total_seconds && (
                  <span className="font-medium text-ink">{formatSeconds(session.total_seconds)}</span>
                )}
              </div>
              {session.notes && (
                <p className="line-clamp-1 text-[12px] text-ink-muted">{session.notes}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {session.is_active ? <Badge variant="success">Activo</Badge> : <Badge variant="muted">Cerrado</Badge>}
                {session.is_corrected && <Badge variant="warning">Corregido</Badge>}
                {session.clock_out_source === "admin" && <Badge variant="outline">Admin</Badge>}
                {session.clock_out_source === "manual" && <Badge variant="outline">Manual</Badge>}
                {(session.auto_closed || session.clock_out_source === "auto") && (
                  <Badge variant="warning">Auto</Badge>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* ── DESKTOP TABLE (≥ md) ────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left">
              {["Empleado", "Entrada", "Salida", "Duracion", "Notas", "Estado", "Acciones"].map((header) => (
                <th key={header} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={index}>
                  {Array.from({ length: 7 }).map((__, cellIndex) => (
                    <td key={cellIndex} className="px-5 py-3">
                      <Skeleton className="h-3.5 w-20" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && (!sessions || sessions.length === 0) && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-ink-muted">
                  No hay fichajes con los filtros seleccionados.
                </td>
              </tr>
            )}

            {!loading &&
              sessions?.map((session) => (
                <tr key={session.id} className="transition-colors hover:bg-surface-muted/50">
                  <td className="px-5 py-3 text-[13px] font-medium text-ink">
                    {session.employee?.full_name ?? session.employee_name ?? `Empleado ${session.employee_id.slice(0, 8)}`}
                  </td>
                  <td className="px-5 py-3 text-[13px] tabular-nums text-ink-muted">
                    {formatDateTime(session.clock_in_time, companyTimeZone)}
                  </td>
                  <td className="px-5 py-3 text-[13px] tabular-nums text-ink-muted">
                    {session.clock_out_time ? formatDateTime(session.clock_out_time, companyTimeZone) : "-"}
                  </td>
                  <td className="px-5 py-3 text-[13px] tabular-nums text-ink-muted">
                    {session.total_seconds ? formatSeconds(session.total_seconds) : "-"}
                  </td>
                  <td className="max-w-[260px] px-5 py-3">
                    {session.notes ? (
                      <span className="line-clamp-2 text-[12px] text-ink-muted">{session.notes}</span>
                    ) : (
                      <span className="text-ink-xmuted">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {session.is_active ? <Badge variant="success">Activo</Badge> : <Badge variant="muted">Cerrado</Badge>}
                      {session.is_corrected && <Badge variant="warning">Corregido</Badge>}
                      {session.clock_out_source === "admin" && <Badge variant="outline">Admin</Badge>}
                      {session.clock_out_source === "manual" && <Badge variant="outline">Manual</Badge>}
                      {(session.auto_closed || session.clock_out_source === "auto") && (
                        <Badge variant="warning">Desfichaje automatico</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(session)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && sessions && (
        <div className="border-t border-border px-4 py-3 text-[12px] text-ink-muted sm:px-5">
          {sessions.length} registro{sessions.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
