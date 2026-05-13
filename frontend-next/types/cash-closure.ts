export type CashClosureShift = "morning" | "afternoon" | "night" | "custom";
export type CashClosurePaymentType = "all" | "cash" | "card";
export type CashClosurePeriod = "day" | "week" | "month";

export interface CashClosureLineInput {
  name: string;
  amount: string;
  theoretical_amount?: string | null;
  real_amount?: string | null;
}

export interface CashClosureLine extends CashClosureLineInput {
  id: string;
  closure_id: string;
  sort_order: number;
}

export interface CashClosureUser {
  id: string;
  full_name: string;
}

export interface CashClosureLocation {
  id: string;
  name: string;
}

export interface CashClosure {
  id: string;
  company_id: string;
  location_id: string | null;
  date: string;
  shift: CashClosureShift;
  custom_shift_name: string | null;
  closed_by_user_id: string | null;
  notes: string | null;
  theoretical_total: string;
  real_total: string;
  balance: string;
  has_incidence: boolean;
  incidence_amount: string;
  incidence_comment: string | null;
  signature_name: string;
  signed_at: string;
  locked_at: string;
  last_edited_by_user_id: string | null;
  last_edited_at: string | null;
  created_at: string;
  updated_at: string;
  closed_by: CashClosureUser | null;
  location: CashClosureLocation | null;
  cash_drawers: CashClosureLine[];
  card_terminals: CashClosureLine[];
}

export interface CashClosureCreateRequest {
  location_id?: string | null;
  date?: string;
  shift: CashClosureShift;
  custom_shift_name?: string | null;
  theoretical_total: string;
  real_total: string;
  notes?: string | null;
  incidence_comment?: string | null;
  cash_drawers: CashClosureLineInput[];
  card_terminals: CashClosureLineInput[];
}

export type CashClosureUpdateRequest = Partial<CashClosureCreateRequest>;

export interface CashClosureFilters {
  date_from?: string;
  date_to?: string;
  shift?: CashClosureShift;
  closed_by_user_id?: string;
  location_id?: string;
  has_incidence?: boolean;
  limit?: number;
  offset?: number;
}

export interface CashClosureAnalyticsFilters {
  date_from?: string;
  date_to?: string;
  shift?: CashClosureShift;
  closed_by_user_id?: string;
  location_id?: string;
  payment_type?: CashClosurePaymentType;
  period?: CashClosurePeriod;
}

export interface CashClosureListResponse {
  items: CashClosure[];
  total: number;
  limit: number;
  offset: number;
}

export interface CashClosureStats {
  closure_count: number;
  total_theoretical: string;
  total_real: string;
  total_balance: string;
  cash_total: string;
  card_total: string;
  incidence_count: number;
  incidence_amount_total: string;
  avg_real_total: string;
}

export interface CashClosureRevenuePoint {
  label: string;
  theoretical_total: string;
  real_total: string;
  cash_total: string;
  card_total: string;
  balance: string;
  incidence_count: number;
}

export interface CashClosurePaymentMix {
  cash_total: string;
  card_total: string;
}

export interface CashClosureEmployeeIncidenceRank {
  user_id: string | null;
  user_name: string;
  closure_count: number;
  incidence_count: number;
  incidence_amount: string;
}

export interface CashClosureChartsResponse {
  revenue_by_period: CashClosureRevenuePoint[];
  theoretical_vs_real: CashClosureRevenuePoint[];
  balance_evolution: CashClosureRevenuePoint[];
  payment_mix: CashClosurePaymentMix;
  top_incidence_users: CashClosureEmployeeIncidenceRank[];
}

export interface CashClosurePrefillResponse {
  date: string;
  shift: CashClosureShift;
  location_id: string | null;
  source: string;
  supports_external_sales: boolean;
  theoretical_total: string;
  real_total: string;
  cash_drawers: CashClosureLineInput[];
  card_terminals: CashClosureLineInput[];
}

export const CASH_CLOSURE_SHIFT_LABELS: Record<CashClosureShift, string> = {
  morning: "Manana",
  afternoon: "Tarde",
  night: "Noche",
  custom: "Personalizado",
};

export const CASH_CLOSURE_PAYMENT_LABELS: Record<CashClosurePaymentType, string> = {
  all: "Todo",
  cash: "Efectivo",
  card: "Tarjeta",
};

export const CASH_CLOSURE_PERIOD_LABELS: Record<CashClosurePeriod, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mes",
};
