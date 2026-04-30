"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expenseTicketsService } from "@/services/expense-tickets.service";
import type {
  ExpenseTicketCreateRequest,
  ExpenseTicketFilters,
  ExpenseTicketMarkPaidRequest,
  ExpenseTicketRejectRequest,
  ExpenseTicketUpdateRequest,
} from "@/types/expense-ticket";

export const expenseTicketKeys = {
  all: ["expense-tickets"] as const,
  lists: () => ["expense-tickets", "list"] as const,
  list: (filters: ExpenseTicketFilters) => ["expense-tickets", "list", filters] as const,
  detail: (id: string) => ["expense-tickets", id] as const,
  summary: (filters: object) => ["expense-tickets", "summary", filters] as const,
};

export function useExpenseTickets(filters: ExpenseTicketFilters = {}) {
  return useQuery({
    queryKey: expenseTicketKeys.list(filters),
    queryFn: () => expenseTicketsService.list(filters),
  });
}

export function useExpenseTicket(id: string) {
  return useQuery({
    queryKey: expenseTicketKeys.detail(id),
    queryFn: () => expenseTicketsService.get(id),
    enabled: Boolean(id),
  });
}

export function useExpenseTicketSummary(
  filters: Pick<ExpenseTicketFilters, "date_from" | "date_to" | "employee_id" | "location_id"> = {},
) {
  return useQuery({
    queryKey: expenseTicketKeys.summary(filters),
    queryFn: () => expenseTicketsService.summary(filters),
  });
}

export function useCreateExpenseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ExpenseTicketCreateRequest) => expenseTicketsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseTicketKeys.all });
    },
  });
}

export function useUpdateExpenseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ExpenseTicketUpdateRequest }) =>
      expenseTicketsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseTicketKeys.all });
    },
  });
}

export function useDeleteExpenseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseTicketsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseTicketKeys.all });
    },
  });
}

export function useApproveExpenseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseTicketsService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseTicketKeys.all });
    },
  });
}

export function useRejectExpenseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ExpenseTicketRejectRequest }) =>
      expenseTicketsService.reject(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseTicketKeys.all });
    },
  });
}

export function useMarkExpenseTicketPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ExpenseTicketMarkPaidRequest }) =>
      expenseTicketsService.markPaid(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseTicketKeys.all });
    },
  });
}

export function useUploadExpenseAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      expenseTicketsService.uploadAttachment(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseTicketKeys.all });
    },
  });
}

export function useExportExpenseTickets() {
  return useMutation({
    mutationFn: (
      filters: Pick<
        ExpenseTicketFilters,
        "date_from" | "date_to" | "employee_id" | "status" | "requires_reimbursement"
      >,
    ) => expenseTicketsService.triggerExport(filters),
  });
}
