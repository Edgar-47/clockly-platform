"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Download, Paperclip, Trash2 } from "lucide-react";
import { Topbar } from "@/components/shared/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ExpenseCategoryBadge,
  ExpenseStatusBadge,
  PaymentSourceBadge,
} from "@/features/expense-tickets/components/expense-ticket-status-badge";
import {
  useApproveExpenseTicket,
  useDeleteExpenseTicket,
  useExpenseTicket,
  useMarkExpenseTicketPaid,
  useRejectExpenseTicket,
  useUploadExpenseAttachment,
} from "@/hooks/use-expense-tickets";
import { useMe } from "@/hooks/use-auth";
import { expenseTicketsService } from "@/services/expense-tickets.service";
import { useState } from "react";

function formatDate(str: string): string {
  const d = new Date(str + (str.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(amount: string | number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <span className="min-w-[160px] flex-shrink-0 text-[12px] font-medium text-ink-muted">{label}</span>
      <span className="text-[13px] text-ink">{value ?? "—"}</span>
    </div>
  );
}

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: me } = useMe();
  const { data: ticket, isLoading } = useExpenseTicket(params.id);

  const canApprove = (me?.permissions ?? []).includes("expense_tickets:approve");

  const approve = useApproveExpenseTicket();
  const reject = useRejectExpenseTicket();
  const markPaid = useMarkExpenseTicketPaid();
  const deleteTicket = useDeleteExpenseTicket();
  const uploadAttachment = useUploadExpenseAttachment();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  function handleApprove() {
    approve.mutate(params.id, {
      onSuccess: () => toast.success("Gasto aprobado."),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  function handleRejectConfirm() {
    reject.mutate(
      { id: params.id, payload: { rejection_reason: rejectReason } },
      {
        onSuccess: () => {
          toast.success("Gasto rechazado.");
          setRejectOpen(false);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  function handleMarkPaid() {
    markPaid.mutate(
      { id: params.id },
      {
        onSuccess: () => toast.success("Gasto marcado como pagado."),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este gasto?")) return;
    deleteTicket.mutate(params.id, {
      onSuccess: () => {
        toast.success("Gasto eliminado.");
        router.push("/expenses");
      },
      onError: (err) => toast.error((err as Error).message),
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAttachment.mutateAsync({ id: params.id, file });
      toast.success("Adjunto subido correctamente.");
    } catch (err) {
      toast.error((err as Error).message ?? "No se pudo subir el archivo.");
    }
  }

  if (isLoading) {
    return (
      <>
        <Topbar title="Detalle de gasto" />
        <div className="mx-auto max-w-2xl space-y-4 p-5 lg:p-6">
          <Skeleton className="h-8 w-32" />
          <Card>
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 py-2.5 border-b border-border">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3.5 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!ticket) {
    return (
      <>
        <Topbar title="Gasto no encontrado" />
        <div className="p-6 text-ink-muted text-[13px]">Gasto no encontrado.</div>
      </>
    );
  }

  const canEdit = ticket.status === "pending";
  const canDelete = ticket.status === "pending" || ticket.status === "rejected";
  const canApproveAction =
    canApprove && (ticket.status === "pending" || ticket.status === "in_review");
  const canMarkPaid = canApprove && ticket.status === "approved";

  return (
    <>
      <Topbar title="Detalle de gasto" />
      <div className="mx-auto max-w-2xl space-y-4 p-5 lg:p-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver
          </Button>

          <div className="flex items-center gap-2">
            {canApproveAction && (
              <Button
                size="sm"
                loading={approve.isPending}
                onClick={handleApprove}
              >
                Aprobar
              </Button>
            )}
            {canApproveAction && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setRejectReason("");
                  setRejectOpen(true);
                }}
              >
                Rechazar
              </Button>
            )}
            {canMarkPaid && (
              <Button size="sm" loading={markPaid.isPending} onClick={handleMarkPaid}>
                Marcar pagado
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger-DEFAULT hover:bg-danger-bg"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Main info card */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-[16px]">{ticket.title}</CardTitle>
              <ExpenseStatusBadge status={ticket.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Row
              label="Empleado"
              value={
                ticket.employee
                  ? `${ticket.employee.first_name} ${ticket.employee.last_name}`
                  : undefined
              }
            />
            <Row
              label="Creado por"
              value={ticket.created_by?.full_name ?? undefined}
            />
            <Row label="Fecha de compra" value={formatDate(ticket.purchase_date)} />
            <Row
              label="Importe"
              value={
                <span className="font-semibold">{formatCurrency(ticket.amount, ticket.currency)}</span>
              }
            />
            <Row label="Categoría" value={<ExpenseCategoryBadge category={ticket.category} />} />
            <Row label="Método de pago" value={<PaymentSourceBadge source={ticket.payment_source} />} />
            <Row
              label="Requiere reembolso"
              value={
                ticket.requires_reimbursement ? (
                  <span className="font-medium text-warning-DEFAULT">
                    Sí
                    {ticket.reimbursement_amount
                      ? ` — ${formatCurrency(ticket.reimbursement_amount, ticket.currency)}`
                      : ""}
                  </span>
                ) : (
                  "No"
                )
              }
            />
            {ticket.description && (
              <Row label="Descripción" value={ticket.description} />
            )}
            {ticket.internal_notes && (
              <Row label="Notas internas" value={ticket.internal_notes} />
            )}
            {ticket.rejection_reason && (
              <Row
                label="Motivo rechazo"
                value={<span className="text-danger-DEFAULT">{ticket.rejection_reason}</span>}
              />
            )}
          </CardContent>
        </Card>

        {/* Approval timeline */}
        {(ticket.approved_at || ticket.rejected_at || ticket.paid_at) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-[14px]">Historial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {ticket.approved_at && (
                <Row label="Aprobado el" value={formatDate(ticket.approved_at)} />
              )}
              {ticket.rejected_at && (
                <Row label="Rechazado el" value={formatDate(ticket.rejected_at)} />
              )}
              {ticket.paid_at && (
                <Row label="Pagado el" value={formatDate(ticket.paid_at)} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Attachment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[14px]">Archivo adjunto</CardTitle>
          </CardHeader>
          <CardContent>
            {ticket.attachment_url ? (
              <div className="space-y-3">
                {ticket.attachment_mime_type?.startsWith("image/") && (
                  <Image
                    src={`/api/expense-tickets/${ticket.id}/attachment`}
                    alt="Adjunto"
                    width={640}
                    height={360}
                    unoptimized
                    className="h-auto max-h-64 w-auto rounded-md border border-border object-contain"
                  />
                )}
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2">
                    <Paperclip className="h-4 w-4 text-ink-muted flex-shrink-0" />
                    <span className="truncate text-[12px] text-ink">
                      {ticket.attachment_file_name}
                    </span>
                    {ticket.attachment_size && (
                      <span className="text-[11px] text-ink-muted">
                        ({(ticket.attachment_size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => expenseTicketsService.downloadAttachment(ticket.id).catch((err) =>
                      toast.error((err as Error).message),
                    )}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] text-ink-muted">No hay adjunto.</p>
                {canEdit && (
                  <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-4 text-[13px] text-ink-muted transition-colors hover:border-primary hover:text-primary">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Paperclip className="h-4 w-4" />
                    {uploadAttachment.isPending ? "Subiendo…" : "Adjuntar foto del ticket"}
                  </label>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={(o) => !o && setRejectOpen(false)}>
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
              <Button variant="ghost" onClick={() => setRejectOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="secondary"
                disabled={!rejectReason.trim() || reject.isPending}
                loading={reject.isPending}
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
