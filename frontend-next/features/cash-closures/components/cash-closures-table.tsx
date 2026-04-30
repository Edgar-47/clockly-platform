"use client";

import { Edit3, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CashClosure } from "@/types/cash-closure";
import { money, shiftDisplay } from "./cash-closure-form";

function numberValue(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function BalanceBadge({ value }: { value: string }) {
  const balance = numberValue(value);
  const ok = Math.abs(balance) < 0.005;
  return (
    <span
      className={
        ok
          ? "inline-flex rounded bg-success-bg px-2 py-1 text-[11px] font-semibold text-success-DEFAULT"
          : "inline-flex rounded bg-danger-bg px-2 py-1 text-[11px] font-semibold text-danger-DEFAULT"
      }
    >
      {money(balance)}
    </span>
  );
}

export function CashClosuresTable({
  closures,
  total,
  loading,
  canManage,
  onEdit,
}: {
  closures?: CashClosure[];
  total?: number;
  loading?: boolean;
  canManage?: boolean;
  onEdit?: (closure: CashClosure) => void;
}) {
  const colCount = canManage ? 9 : 8;

  return (
    <div className="rounded-lg border border-border bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
        <h2 className="text-[14px] font-semibold text-ink">
          Historial{" "}
          <span className="font-normal text-ink-xmuted">({total ?? closures?.length ?? 0})</span>
        </h2>
      </div>

      <div className="divide-y divide-border md:hidden">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 px-4 py-3.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          ))}

        {!loading && (!closures || closures.length === 0) && (
          <div className="px-4 py-10 text-center text-[13px] text-ink-muted">
            No hay cierres registrados.
          </div>
        )}

        {!loading &&
          closures?.map((closure) => (
            <div key={closure.id} className="space-y-2 px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    {formatDate(closure.date)} - {shiftDisplay(closure.shift, closure.custom_shift_name)}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {closure.closed_by?.full_name ?? closure.signature_name}
                  </p>
                </div>
                <BalanceBadge value={closure.balance} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
                <span>Real {money(numberValue(closure.real_total))}</span>
                <span>Teorico {money(numberValue(closure.theoretical_total))}</span>
                {closure.locked_at && (
                  <span className="inline-flex items-center gap-1">
                    <LockKeyhole className="h-3 w-3" />
                    Bloqueado
                  </span>
                )}
              </div>
              {canManage && (
                <Button type="button" size="sm" variant="secondary" onClick={() => onEdit?.(closure)}>
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
            </div>
          ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left">
              {[
                "Fecha",
                "Turno",
                "Usuario",
                "Local",
                "Teorico",
                "Real",
                "Balance",
                "Estado",
                ...(canManage ? ["Acciones"] : []),
              ].map((heading) => (
                <th key={heading} className="px-5 py-2.5 text-[11px] font-semibold uppercase text-ink-muted">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              Array.from({ length: 5 }).map((_, row) => (
                <tr key={row}>
                  {Array.from({ length: colCount }).map((__, col) => (
                    <td key={col} className="px-5 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && (!closures || closures.length === 0) && (
              <tr>
                <td colSpan={colCount} className="px-5 py-10 text-center text-[13px] text-ink-muted">
                  No hay cierres registrados.
                </td>
              </tr>
            )}

            {!loading &&
              closures?.map((closure) => (
                <tr key={closure.id} className="transition-colors hover:bg-surface-muted/60">
                  <td className="px-5 py-3 text-[13px] tabular-nums text-ink-muted">
                    {formatDate(closure.date)}
                  </td>
                  <td className="px-5 py-3 text-[13px] font-medium text-ink">
                    {shiftDisplay(closure.shift, closure.custom_shift_name)}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted">
                    {closure.closed_by?.full_name ?? closure.signature_name}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted">
                    {closure.location?.name ?? "Sin local"}
                  </td>
                  <td className="px-5 py-3 text-[13px] tabular-nums text-ink-muted">
                    {money(numberValue(closure.theoretical_total))}
                  </td>
                  <td className="px-5 py-3 text-[13px] font-semibold tabular-nums text-ink">
                    {money(numberValue(closure.real_total))}
                  </td>
                  <td className="px-5 py-3">
                    <BalanceBadge value={closure.balance} />
                  </td>
                  <td className="px-5 py-3 text-[12px] text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      Bloqueado
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-5 py-3">
                      <Button type="button" size="icon-sm" variant="ghost" title="Editar" onClick={() => onEdit?.(closure)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
