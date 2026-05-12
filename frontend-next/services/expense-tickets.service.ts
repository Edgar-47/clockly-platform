import { api } from "@/lib/api-client";
import type {
  ExpenseTicket,
  ExpenseTicketCreateRequest,
  ExpenseTicketFilters,
  ExpenseTicketListResponse,
  ExpenseTicketMarkPaidRequest,
  ExpenseTicketRejectRequest,
  ExpenseTicketSummary,
  ExpenseTicketUpdateRequest,
} from "@/types/expense-ticket";

const BASE = "/expense-tickets";

function buildParams(filters: ExpenseTicketFilters): string {
  const params = new URLSearchParams();
  if (filters.employee_id) params.set("employee_id", filters.employee_id);
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.payment_source) params.set("payment_source", filters.payment_source);
  if (filters.requires_reimbursement !== undefined)
    params.set("requires_reimbursement", String(filters.requires_reimbursement));
  if (filters.location_id) params.set("location_id", filters.location_id);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.search) params.set("search", filters.search);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  return params.toString();
}

export const expenseTicketsService = {
  list: (filters: ExpenseTicketFilters = {}): Promise<ExpenseTicketListResponse> => {
    const qs = buildParams(filters);
    return api.get<ExpenseTicketListResponse>(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  summary: (filters: Pick<ExpenseTicketFilters, "date_from" | "date_to" | "employee_id" | "location_id"> = {}): Promise<ExpenseTicketSummary> => {
    const params = new URLSearchParams();
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.employee_id) params.set("employee_id", filters.employee_id);
    if (filters.location_id) params.set("location_id", filters.location_id);
    const qs = params.toString();
    return api.get<ExpenseTicketSummary>(`${BASE}/summary${qs ? `?${qs}` : ""}`);
  },

  get: (id: string): Promise<ExpenseTicket> => api.get<ExpenseTicket>(`${BASE}/${id}`),

  create: (payload: ExpenseTicketCreateRequest): Promise<ExpenseTicket> =>
    api.post<ExpenseTicket>(BASE, payload),

  update: (id: string, payload: ExpenseTicketUpdateRequest): Promise<ExpenseTicket> =>
    api.patch<ExpenseTicket>(`${BASE}/${id}`, payload),

  delete: (id: string): Promise<void> =>
    api.delete<void>(`${BASE}/${id}`),

  approve: (id: string): Promise<ExpenseTicket> =>
    api.post<ExpenseTicket>(`${BASE}/${id}/approve`, {}),

  reject: (id: string, payload: ExpenseTicketRejectRequest): Promise<ExpenseTicket> =>
    api.post<ExpenseTicket>(`${BASE}/${id}/reject`, payload),

  markPaid: (id: string, payload: ExpenseTicketMarkPaidRequest = {}): Promise<ExpenseTicket> =>
    api.post<ExpenseTicket>(`${BASE}/${id}/mark-paid`, payload),

  uploadAttachment: async (id: string, file: File): Promise<ExpenseTicket> => {
    const formData = new FormData();
    formData.append("file", file);
    return api.postForm<ExpenseTicket>(`${BASE}/${id}/attachment`, formData);
  },

  downloadAttachment: async (id: string): Promise<void> => {
    const { blob, filename } = await api.download(`${BASE}/${id}/attachment`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? "adjunto";
    a.click();
    URL.revokeObjectURL(url);
  },

  deleteAttachment: (id: string): Promise<void> =>
    api.delete<void>(`${BASE}/${id}/attachment`),

  triggerExport: async (
    filters: Pick<
      ExpenseTicketFilters,
      "date_from" | "date_to" | "employee_id" | "status" | "requires_reimbursement"
    > = {},
  ): Promise<void> => {
    const params = new URLSearchParams({ format: "xlsx" });
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.employee_id) params.set("employee_id", filters.employee_id);
    if (filters.status) params.set("status", filters.status);
    if (filters.requires_reimbursement !== undefined)
      params.set("requires_reimbursement", String(filters.requires_reimbursement));

    const response = await fetch(`/api/expense-tickets/export?${params.toString()}`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) throw new Error("No se pudo exportar.");
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition");
    const match = disposition?.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] ?? "clockly-gastos.xlsx";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
