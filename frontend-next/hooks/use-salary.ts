"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salaryService } from "@/services/salary.service";
import type { SalaryProfileCreateRequest, SalaryProfileUpdateRequest } from "@/types/salary";

export const salaryKeys = {
  profiles: (employeeId?: string) => ["salary", "profiles", employeeId ?? "all"] as const,
  calculation: (employeeId: string, periodStart: string, periodEnd: string) =>
    ["salary", "calculation", employeeId, periodStart, periodEnd] as const,
};

export function useSalaryProfiles(employeeId?: string, enabled = true) {
  return useQuery({
    queryKey: salaryKeys.profiles(employeeId),
    queryFn: () => salaryService.listProfiles(employeeId),
    enabled,
  });
}

export function useCreateSalaryProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SalaryProfileCreateRequest) => salaryService.createProfile(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: salaryKeys.profiles(payload.employee_id) });
      queryClient.invalidateQueries({ queryKey: ["salary"] });
    },
  });
}

export function useUpdateSalaryProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SalaryProfileUpdateRequest }) =>
      salaryService.updateProfile(id, payload),
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: salaryKeys.profiles(profile.employee_id) });
      queryClient.invalidateQueries({ queryKey: ["salary"] });
    },
  });
}

export function useSalaryCalculation(employeeId: string, periodStart: string, periodEnd: string, enabled: boolean) {
  return useQuery({
    queryKey: salaryKeys.calculation(employeeId, periodStart, periodEnd),
    queryFn: () => salaryService.calculate(employeeId, periodStart, periodEnd),
    enabled,
  });
}

export function useGenerateSalaryCalculation() {
  return useMutation({
    mutationFn: ({ employeeId, periodStart, periodEnd }: { employeeId: string; periodStart: string; periodEnd: string }) =>
      salaryService.generate(employeeId, periodStart, periodEnd),
  });
}
