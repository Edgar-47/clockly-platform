"use client";

import { useState } from "react";
import { CheckCircle2, EyeOff, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LateArrivalStatusBadge } from "./late-arrival-status-badge";
import { JustifyLateArrivalModal } from "./justify-late-arrival-modal";
import type { LateArrival } from "@/types/late-arrival";
import { METHOD_LABELS } from "@/types/late-arrival";

function formatTime(t: string): string {
  return t.slice(0, 5);
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

interface Props {
  records?: LateArrival[];
  total?: number;
  loading?: boolean;
  canManage?: boolean;
  onStatusChange?: (id: string, status: string, justification?: string) => void;
  updatingId?: string | null;
}

export function LateArrivalsTable({
  records,
  loading,
  canManage,
  onStatusChange,
  updatingId,
}: Props) {
  const [justifyTarget, setJustifyTarget] = useState<LateArrival | null>(null);

  if (loading) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-surface-bg">
            <tr>
              {["Empleado", "Fecha", "Previsto", "Real", "Retraso", "Estado", ""].map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left font-semibold text-ink-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="rounded-lg border border-border py-16 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success-DEFAULT opacity-70" />
        <p className="text-[14px] font-medium text-ink">Sin retrasos registrados</p>
        <p className="mt-1 text-[12px] text-ink-muted">
          No hay retrasos que coincidan con los filtros aplicados.
        </p>
      </div>
    );
  }

  function handleQuickStatus(record: LateArrival, status: string) {
    onStatusChange?.(record.id, status);
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-surface-bg">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-ink-muted">Empleado</th>
              <th className="px-3 py-2.5 text-left font-semibold text-ink-muted">Fecha</th>
              <th className="px-3 py-2.5 text-left font-semibold text-ink-muted">Previsto</th>
              <th className="px-3 py-2.5 text-left font-semibold text-ink-muted">Real</th>
              <th className="px-3 py-2.5 text-left font-semibold text-ink-muted">Retraso</th>
              <th className="px-3 py-2.5 text-left font-semibold text-ink-muted">Método</th>
              <th className="px-3 py-2.5 text-left font-semibold text-ink-muted">Estado</th>
              <th className="px-3 py-2.5 text-left font-semibold text-ink-muted">Justificación</th>
              {canManage && <th className="px-3 py-2.5 text-right font-semibold text-ink-muted">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((record) => {
              const isUpdating = updatingId === record.id;
              return (
                <tr key={record.id} className={isUpdating ? "opacity-60" : "hover:bg-surface-bg/50"}>
                  <td className="px-3 py-2.5 font-medium text-ink">
                    {record.employee
                      ? `${record.employee.first_name} ${record.employee.last_name}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-muted">{formatDate(record.date)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-muted">{formatTime(record.scheduled_start_time)}</td>
                  <td className="px-3 py-2.5 tabular-nums font-medium text-danger-DEFAULT">
                    {formatTime(record.actual_clock_in_time)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center tabular-nums font-semibold text-danger-DEFAULT">
                      +{record.delay_minutes_total} min
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-ink-muted">
                    {record.clock_in_method
                      ? METHOD_LABELS[record.clock_in_method] ?? record.clock_in_method
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <LateArrivalStatusBadge status={record.status} />
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px] truncate text-[12px] text-ink-muted">
                    {record.justification_text || "—"}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Justificar"
                          onClick={() => setJustifyTarget(record)}
                          disabled={isUpdating}
                          className="h-7 w-7 text-success-DEFAULT hover:text-success-DEFAULT"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="No justificado"
                          onClick={() => handleQuickStatus(record, "unjustified")}
                          disabled={isUpdating}
                          className="h-7 w-7 text-danger-DEFAULT hover:text-danger-DEFAULT"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ignorar"
                          onClick={() => handleQuickStatus(record, "ignored")}
                          disabled={isUpdating}
                          className="h-7 w-7 text-ink-muted hover:text-ink-muted"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {justifyTarget && (
        <JustifyLateArrivalModal
          record={justifyTarget}
          onClose={() => setJustifyTarget(null)}
          onSubmit={(justification) => {
            onStatusChange?.(justifyTarget.id, "justified", justification);
            setJustifyTarget(null);
          }}
        />
      )}
    </>
  );
}
