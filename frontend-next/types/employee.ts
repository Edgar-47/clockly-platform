export type EmployeeRole = "owner" | "admin" | "hr_manager" | "manager" | "employee";

export interface Employee {
  id: string;
  company_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  initials: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  role_title: string | null;
  hired_on: string | null;
  is_active: boolean;
  has_pin: boolean;
  schedule_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreateRequest {
  first_name: string;
  last_name: string;
  dni?: string;
  password?: string;
  pin?: string;
  email?: string;
  phone?: string;
  role_title?: string;
  hired_on?: string;
  is_active?: boolean;
}

export interface CsvRowError {
  row: number;
  field: string;
  message: string;
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: CsvRowError[];
  preview: Record<string, string>[];
}

export interface EmployeeUpdateRequest {
  first_name?: string;
  last_name?: string;
  dni?: string;
  email?: string;
  phone?: string;
  role_title?: string;
  hired_on?: string;
  password?: string;
  pin?: string | null;
  is_active?: boolean;
  schedule_id?: string | null;
}
