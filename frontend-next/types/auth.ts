import type { PlanFeatures, PlanType } from "./plan";

export type UserRole = "superadmin" | "owner" | "admin" | "hr_manager" | "manager" | "employee";

export interface AuthUser {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AuthEmployee {
  id: string;
  company_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  role_title: string | null;
  hired_on: string | null;
  is_active: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  has_pin: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyContext extends PlanFeatures {
  id: string;
  name: string;
  slug: string;
  cif: string | null;
  sector: string | null;
  company_size: string | null;
  timezone: string;
  plan_type: PlanType;
  plan_name: string;
  max_employees: number | null;
  trial_ends_at: string | null;
  is_active_subscription: boolean;
  is_beta_user: boolean;
  stripe_subscription_status: string | null;
  stripe_current_period_end: string | null;
  stripe_cancel_at_period_end: boolean;
  created_by: string | null;
}

export interface AuthPayload {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
  employee: AuthEmployee | null;
  company: CompanyContext;
  permissions: string[];
}

export interface MePayload {
  user: AuthUser;
  employee: AuthEmployee | null;
  company: CompanyContext;
  permissions: string[];
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterCompanyRequest {
  company_name: string;
  owner_email: string;
  owner_full_name: string;
  password: string;
  timezone: string;
  plan_type: PlanType;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
}

export interface MessageResponse {
  ok: true;
  message: string;
}

// Superadmin is reserved for a future internal console and must not enter tenant dashboards.
export const ADMIN_ROLES: UserRole[] = ["owner", "admin", "hr_manager", "manager"];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}
