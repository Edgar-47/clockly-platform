"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/shared/topbar";
import { Button } from "@/components/ui/button";
import { ExpenseTicketFilters } from "@/features/expense-tickets/components/expense-ticket-filters";
import { ExpenseTicketsTable } from "@/features/expense-tickets/components/expense-tickets-table";
import { ExpenseTicketSummaryCards } from "@/features/expense-tickets/components/expense-ticket-summary-cards";
import {
  useApproveExpenseTicket,
  useDeleteExpenseTicket,
  useExpenseTicketSummary,
  useExpenseTickets,
  useExportExpenseTickets,
  useMarkExpenseTicketPaid,
  useRejectExpenseTicket,
} from "@/hooks/use-expense-tickets";
import { useMe } from "@/hooks/use-auth";
import type { ExpenseTicketFilters as Filters } from "@/types/expense-ticket";

const LIMIT = 50;

export default function ExpensesPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const [filters, setFilters] = useState<Filters>({ limit: LIMIT, offset: 0 });

  const canApprove = (me?.permissions ?? []).includes("expense_tickets:approve");
  const canExport = (me?.permissions ?? []).includes("expense_tickets:export");

  const { data: listData, isLoading } = useExpenseTickets(filters);
  const { data: summary, isLoading: summaryLoading } = useExpenseTicketSummary({
    date_from: filters.date_from,
    date_to: filters.date_to,
    employee_id: filters.employee_id,
  });

  const approve = useApproveExpenseTicket();
  const reject = useRejectExpenseTicket();
  const markPaid = useMarkExpenseTicketPaid();
  const deleteTicket = useDeleteExpenseTicket();
  const exportTickets = useExportExpenseTickets();

  function handleApprove(id: string) {
    approve.mutate(id, {
      onSuccess: () => toast.success("Gasto aprobado."),
      onError: (err) => toast.error((err as Error).message ?? "No se pudo aprobar."),
    });
  }

  function handleReject(id: string, reason: string) {
    reject.mutate(
      { id, payload: { rejection_reason: reason } },
      {
        onSuccess: () => toast.success("Gasto rechazado."),
        onError: (err) => toast.error((err as Error).message ?? "No se pudo rechazar."),
      },
    );
  }

  function handleMarkPaid(id: string) {
    markPaid.mutate(
      { id },
      {
        onSuccess: () => toast.success("Gasto marcado como pagado."),
        onError: (err) => toast.error((err as Error).message ?? "No se pudo marcar como pagado."),
      },
    );
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    deleteTicket.mutate(id, {
      onSuccess: () => toast.success("Gasto eliminado."),
      onError: (err) => toast.error((err as Error).message ?? "No se pudo eliminar."),
    });
  }

  function handleExport() {
    exportTickets.mutate(
      {
        date_from: filters.date_from,
        date_to: filters.date_to,
        employee_id: filters.employee_id,
        status: filters.status,
        requires_reimbursement: filters.requires_reimbursement,
      },
      {
        onSuccess: () => toast.success("Exportación descargada."),
        onError: (err) => toast.error((err as Error).message ?? "Error al exportar."),
      },
    );
  }

  return (
    <>
      <Topbar title="Gastos" />
      <div className="space-y-5 p-5 lg:p-6">
        <ExpenseTicketSummaryCards summary={summary} loading={summaryLoading} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ExpenseTicketFilters filters={filters} onChange={setFilters} />
          <div className="flex items-center gap-2 shrink-0">
            {canExport && (
              <Button
                variant="secondary"
                size="sm"
                loading={exportTickets.isPending}
                onClick={handleExport}
              >
                Exportar Excel
              </Button>
            )}
            <Button size="sm" onClick={() => router.push("/expenses/new")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo gasto
            </Button>
          </div>
        </div>

        <ExpenseTicketsTable
          tickets={listData?.items}
          total={listData?.total}
          loading={isLoading}
          canApprove={canApprove}
          onApprove={handleApprove}
          onReject={handleReject}
          onMarkPaid={handleMarkPaid}
          onDelete={handleDelete}
          approvingId={approve.variables ?? null}
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
                onClick={() => setFilters((f) => ({ ...f, offset: (f.offset ?? 0) + LIMIT }))}
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
