"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { expenseTicketsService } from "@/services/expense-tickets.service";
import {
  ExpenseCategoryBadge,
  ExpenseStatusBadge,
  PaymentSourceBadge,
} from "./expense-ticket-status-badge";
import type { ExpenseTicket } from "@/types/expense-ticket";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(amount: string | number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

interface Props {
  tickets?: ExpenseTicket[];
  total?: number;
  loading?: boolean;
  canApprove?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onMarkPaid?: (id: string) => void;
  onDelete?: (id: string) => void;
  approvingId?: string | null;
}

export function ExpenseTicketsTable({
  tickets,
  total,
  loading,
  canApprove,
  onApprove,
  onReject,
  onMarkPaid,
  onDelete,
  approvingId,
}: Props) {
  const router = useRouter();
  const [rejectDialog, setRejectDialog] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const columnCount = 7 + (canApprove ? 1 : 0);

  function handleRejectConfirm() {
    if (!rejectDialog || !rejectReason.trim()) return;
    onReject?.(rejectDialog.id, rejectReason.trim());
    setRejectDialog(null);
    setRejectReason("");
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
          <h2 className="text-[14px] font-semibold text-ink">
            Gastos{" "}
            <span className="text-ink-xmuted font-normal">
              ({total ?? tickets?.length ?? 0})
            </span>
          </h2>
        </div>

        {/* ── MOBILE (< md) ── */}
        <div className="divide-y divide-border md:hidden">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 px-4 py-3.5">
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-3">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}

          {!loading && (!tickets || tickets.length === 0) && (
            <div className="px-4 py-10 text-center text-[13px] text-ink-muted">
              No hay gastos registrados.
            </div>
          )}

          {!loading &&
            tickets?.map((t) => (
              <div
                key={t.id}
                className="space-y-2 px-4 py-3.5 cursor-pointer hover:bg-surface-muted/40"
                onClick={() => router.push(`/expenses/${t.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-ink leading-snug">{t.title}</p>
                    {t.employee && (
                      <p className="text-[11px] text-ink-muted">
                        {t.employee.first_name} {t.employee.last_name}
                      </p>
                    )}
                  </div>
                  <ExpenseStatusBadge status={t.status} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-medium text-ink">{formatCurrency(t.amount, t.currency)}</span>
                  <span className="text-[11px] text-ink-muted">{formatDate(t.purchase_date)}</span>
                  <ExpenseCategoryBadge category={t.category} />
                </div>
              </div>
            ))}
        </div>

        {/* ── DESKTOP (≥ md) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                {[
                  "Concepto",
                  "Empleado",
                  "Fecha",
                  "Importe",
                  "Categoría",
                  "Pago",
                  "Estado",
                  ...(canApprove ? ["Acciones"] : []),
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: columnCount }).map((__, j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className="h-3.5 w-24" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && (!tickets || tickets.length === 0) && (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-5 py-10 text-center text-[13px] text-ink-muted"
                  >
                    No hay gastos registrados.
                  </td>
                </tr>
              )}

              {!loading &&
                tickets?.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-surface-muted/60 transition-colors duration-100 cursor-pointer"
                    onClick={() => router.push(`/expenses/${t.id}`)}
                  >
                    <td className="px-5 py-3">
                      <span className="text-[13px] font-semibold text-ink">{t.title}</span>
                      {t.requires_reimbursement && (
                        <span className="ml-1.5 rounded bg-warning-bg px-1.5 py-0.5 text-[10px] font-medium text-warning-DEFAULT">
                          Reembolso
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-ink-muted">
                      {t.employee
                        ? `${t.employee.first_name} ${t.employee.last_name}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-ink-muted tabular-nums">
                      {formatDate(t.purchase_date)}
                    </td>
                    <td className="px-5 py-3 text-[13px] font-medium text-ink tabular-nums">
                      {formatCurrency(t.amount, t.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <ExpenseCategoryBadge category={t.category} />
                    </td>
                    <td className="px-5 py-3">
                      <PaymentSourceBadge source={t.payment_source} />
                    </td>
                    <td className="px-5 py-3">
                      <ExpenseStatusBadge status={t.status} />
                    </td>

                    {canApprove && (
                      <td
                        className="px-5 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/expenses/${t.id}`)}>
                              Ver detalle
                            </DropdownMenuItem>

                            {(t.status === "pending" || t.status === "in_review") && (
                              <DropdownMenuItem
                                onClick={() => onApprove?.(t.id)}
                                disabled={approvingId === t.id}
                              >
                                Aprobar
                              </DropdownMenuItem>
                            )}

                            {(t.status === "pending" || t.status === "in_review") && (
                              <DropdownMenuItem
                                className="text-danger-DEFAULT"
                                onClick={() => {
                                  setRejectDialog({ id: t.id });
                                  setRejectReason("");
                                }}
                              >
                                Rechazar
                              </DropdownMenuItem>
                            )}

                            {t.status === "approved" && (
                              <DropdownMenuItem onClick={() => onMarkPaid?.(t.id)}>
                                Marcar como pagado
                              </DropdownMenuItem>
                            )}

                            {t.attachment_key && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => expenseTicketsService.downloadAttachment(t.id)}
                                >
                                  <Download className="mr-2 h-3.5 w-3.5" />
                                  Descargar adjunto
                                </DropdownMenuItem>
                              </>
                            )}

                            {(t.status === "pending" || t.status === "rejected") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-danger-DEFAULT"
                                  onClick={() => onDelete?.(t.id)}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialog !== null} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Motivo de rechazo *</Label>
              <textarea
                className="min-h-[80px] w-full rounded border border-border-strong bg-white px-3 py-2 text-[13px] text-ink outline-none transition-all placeholder:text-ink-xmuted focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
                placeholder="Indica el motivo…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejectDialog(null)}>
                Cancelar
              </Button>
              <Button
                variant="secondary"
                disabled={!rejectReason.trim()}
                onClick={handleRejectConfirm}
              >
                Confirmar rechazo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
