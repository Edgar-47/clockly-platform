export type SalaryType = "hourly" | "daily" | "shift" | "monthly" | "weekly";

export interface SalaryProfile {
  id: string;
  company_id: string;
  employee_id: string;
  salary_type: SalaryType;
  amount: string;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

export interface SalaryProfileCreateRequest {
  employee_id: string;
  salary_type: SalaryType;
  amount: string;
  currency?: string;
  effective_from: string;
  effective_to?: string | null;
  notes?: string | null;
}

export interface SalaryProfileUpdateRequest {
  effective_to?: string | null;
  notes?: string | null;
}

export interface SalaryCalculationLine {
  salary_profile_id: string;
  salary_type: SalaryType;
  amount: string;
  currency: string;
  period_start: string;
  period_end: string;
  total_hours: string;
  total_days: number;
  total_shifts: number;
  incident_count: number;
  gross_estimated_amount: string;
}

export interface SalaryCalculation {
  employee_id: string;
  period_start: string;
  period_end: string;
  currency: string;
  gross_estimated_amount: string;
  total_hours: string;
  total_days: number;
  total_shifts: number;
  incident_count: number;
  open_sessions_ignored: number;
  lines: SalaryCalculationLine[];
  warning: string;
}

export interface StoredSalaryCalculation extends SalaryCalculation {
  id: string;
  generated_by_user_id: string | null;
  generated_at: string;
}
