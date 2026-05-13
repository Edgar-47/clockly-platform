import { api } from "@/lib/api-client";
import type {
  OnboardingCompanyUpdateRequest,
  OnboardingFirstEmployeeRequest,
  OnboardingFirstEmployeeResponse,
  OnboardingInvitationResponse,
  OnboardingInviteRequest,
  OnboardingKioskPinRequest,
  OnboardingStatus,
} from "@/types/onboarding";

export const onboardingService = {
  status: () => api.get<OnboardingStatus>("/onboarding/status"),

  updateCompany: (payload: OnboardingCompanyUpdateRequest) =>
    api.put<OnboardingStatus>("/onboarding/company", payload),

  createFirstEmployee: (payload: OnboardingFirstEmployeeRequest) =>
    api.post<OnboardingFirstEmployeeResponse>("/onboarding/first-employee", payload),

  configureKioskPin: (payload: OnboardingKioskPinRequest) =>
    api.post<OnboardingStatus>("/onboarding/kiosk-pin", payload),

  createInvitation: (payload: OnboardingInviteRequest) =>
    api.post<OnboardingInvitationResponse>("/onboarding/invitations", payload),

  skipInvitations: () =>
    api.post<{ status: OnboardingStatus }>("/onboarding/invitations/skip").then((response) => response.status),

  complete: () =>
    api.post<{ status: OnboardingStatus }>("/onboarding/complete").then((response) => response.status),
};
