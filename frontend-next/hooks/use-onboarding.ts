"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardingService } from "@/services/onboarding.service";
import type {
  OnboardingCompanyUpdateRequest,
  OnboardingFirstEmployeeRequest,
  OnboardingInviteRequest,
  OnboardingKioskPinRequest,
} from "@/types/onboarding";

export const onboardingKeys = {
  status: ["onboarding", "status"] as const,
};

export function useOnboardingStatus() {
  return useQuery({
    queryKey: onboardingKeys.status,
    queryFn: onboardingService.status,
    retry: false,
  });
}

export function useUpdateOnboardingCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OnboardingCompanyUpdateRequest) => onboardingService.updateCompany(payload),
    onSuccess: (status) => queryClient.setQueryData(onboardingKeys.status, status),
  });
}

export function useCreateOnboardingEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OnboardingFirstEmployeeRequest) => onboardingService.createFirstEmployee(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(onboardingKeys.status, response.status);
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useConfigureKioskPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OnboardingKioskPinRequest) => onboardingService.configureKioskPin(payload),
    onSuccess: (status) => {
      queryClient.setQueryData(onboardingKeys.status, status);
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useCreateOnboardingInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OnboardingInviteRequest) => onboardingService.createInvitation(payload),
    onSuccess: (response) => queryClient.setQueryData(onboardingKeys.status, response.status),
  });
}

export function useSkipOnboardingInvitations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: onboardingService.skipInvitations,
    onSuccess: (status) => queryClient.setQueryData(onboardingKeys.status, status),
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: onboardingService.complete,
    onSuccess: (status) => queryClient.setQueryData(onboardingKeys.status, status),
  });
}
