export type ExpenseCategory = "food" | "cleaning" | "supplies" | "repair" | "transport" | "other";
export type PaymentSource =
  | "personal_money"
  | "company_account"
  | "company_card"
  | "tips_pool"
  | "cash_register"
  | "other";
export type ExpenseStatus = "pending" | "in_review" | "approved" | "rejected" | "paid";

export interface EmployeeSnapshot {
  id: string;
  first_name: string;
  last_name: string;
}

export interface UserSnapshot {
  id: string;
  full_name: string;
}

export interface ExpenseTicket {
  id: string;
  company_id: string;
  location_id: string | null;
  employee_id: string | null;
  created_by_user_id: string | null;
  title: string;
  description: string | null;
  category: ExpenseCategory;
  purchase_date: string;
  amount: string;
  currency: string;
  payment_source: PaymentSource;
  requires_reimbursement: boolean;
  reimbursement_amount: string | null;
  status: ExpenseStatus;
  rejection_reason: string | null;
  internal_notes: string | null;
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejected_by_user_id: string | null;
  rejected_at: string | null;
  paid_by_user_id: string | null;
  paid_at: string | null;
  attachment_key: string | null;
  attachment_file_name: string | null;
  attachment_mime_type: string | null;
  attachment_size: number | null;
  created_at: string;
  updated_at: string;
  employee: EmployeeSnapshot | null;
  created_by: UserSnapshot | null;
}

export interface ExpenseTicketListResponse {
  items: ExpenseTicket[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExpenseTicketSummary {
  total_count: number;
  total_amount: number;
  pending_amount: number;
  in_review_amount: number;
  approved_amount: number;
  rejected_amount: number;
  paid_amount: number;
  pending_reimbursement_amount: number;
  avg_amount: number;
}

export interface ExpenseTicketCreateRequest {
  title: string;
  description?: string;
  category: ExpenseCategory;
  purchase_date: string;
  amount: string;
  currency?: string;
  payment_source: PaymentSource;
  requires_reimbursement?: boolean;
  reimbursement_amount?: string;
  internal_notes?: string;
  location_id?: string;
  employee_id?: string;
}

export interface ExpenseTicketUpdateRequest {
  title?: string;
  description?: string;
  category?: ExpenseCategory;
  purchase_date?: string;
  amount?: string;
  currency?: string;
  payment_source?: PaymentSource;
  requires_reimbursement?: boolean;
  reimbursement_amount?: string;
  internal_notes?: string;
  location_id?: string;
}

export interface ExpenseTicketRejectRequest {
  rejection_reason: string;
}

export interface ExpenseTicketMarkPaidRequest {
  notes?: string;
}

export interface ExpenseTicketFilters {
  employee_id?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  payment_source?: PaymentSource;
  requires_reimbursement?: boolean;
  location_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: "Comida",
  cleaning: "Limpieza",
  supplies: "Material",
  repair: "Reparación",
  transport: "Transporte",
  other: "Otros",
};

export const PAYMENT_SOURCE_LABELS: Record<PaymentSource, string> = {
  personal_money: "Dinero propio",
  company_account: "Cuenta empresa",
  company_card: "Tarjeta empresa",
  tips_pool: "Bote de propinas",
  cash_register: "Caja efectivo",
  other: "Otro",
};

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  paid: "Pagado",
};
