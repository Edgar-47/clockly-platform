import type { Employee } from "./employee";
import type { InvitationCreateResponse } from "./member";
import type { PlanType } from "./plan";
import type { UserRole } from "./auth";

export interface OnboardingStatus {
  company_id: string;
  company_name: string;
  timezone: string;
  plan_type: PlanType;
  onboarding_step: "company" | "employee" | "kiosk" | "invitations" | "complete" | string;
  onboarding_completed_at: string | null;
  first_employee_created_at: string | null;
  kiosk_pin_configured_at: string | null;
  invitations_completed_at: string | null;
  employee_count: number;
  has_kiosk_pin: boolean;
}

export interface OnboardingCompanyUpdateRequest {
  company_name: string;
  timezone: string;
  plan_type: PlanType;
}

export interface OnboardingFirstEmployeeRequest {
  first_name: string;
  last_name: string;
  email?: string;
  role_title?: string;
  pin?: string;
}

export interface OnboardingKioskPinRequest {
  employee_id: string;
  pin: string;
}

export interface OnboardingInviteRequest {
  email: string;
  role: UserRole;
}

export interface OnboardingFirstEmployeeResponse {
  employee: Employee;
  status: OnboardingStatus;
}

export interface OnboardingInvitationResponse {
  invitation: InvitationCreateResponse;
  status: OnboardingStatus;
}
