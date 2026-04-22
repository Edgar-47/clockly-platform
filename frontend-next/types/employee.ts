export type EmployeeRole = "owner" | "admin" | "employee";

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  initials: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  internal_code: string | null;
  role: EmployeeRole;
  role_title: string | null;
  active: boolean;
  created_at: string;
}

export interface EmployeeCreateRequest {
  first_name: string;
  last_name: string;
  dni: string;
  password: string;
  role?: EmployeeRole;
  internal_code?: string;
  pin_code?: string;
  email?: string;
  phone?: string;
  role_title?: string;
}

export interface EmployeeUpdateRequest {
  first_name: string;
  last_name: string;
  dni: string;
  role?: EmployeeRole;
  internal_code?: string;
  pin_code?: string;
  email?: string;
  phone?: string;
  role_title?: string;
  active?: boolean;
}
