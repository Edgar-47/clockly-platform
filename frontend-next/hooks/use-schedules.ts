"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schedulesService } from "@/services/schedules.service";
import type { ScheduleCreate, ScheduleUpdate } from "@/types/schedule";

export const scheduleKeys = {
  list: (includeInactive?: boolean) => ["schedules", "list", includeInactive] as const,
  detail: (id: string) => ["schedules", "detail", id] as const,
  employeeSchedule: (employeeId: string) => ["schedules", "employee", employeeId] as const,
};

export function useSchedules(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: scheduleKeys.list(includeInactive),
    queryFn: () => schedulesService.list(includeInactive),
    enabled,
    staleTime: 60_000,
  });
}

export function useSchedule(id: string, enabled = true) {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => schedulesService.get(id),
    enabled: enabled && !!id,
    staleTime: 60_000,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ScheduleCreate) => schedulesService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ScheduleUpdate }) =>
      schedulesService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useEmployeeSchedule(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: scheduleKeys.employeeSchedule(employeeId),
    queryFn: () => schedulesService.getEmployeeSchedule(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 60_000,
  });
}

export function useAssignEmployeeSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, scheduleId }: { employeeId: string; scheduleId: string | null }) =>
      schedulesService.assignEmployeeSchedule(employeeId, scheduleId),
    onSuccess: (_, { employeeId }) => {
      qc.invalidateQueries({ queryKey: ["schedules", "employee", employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["schedules", "list"] });
    },
  });
}
