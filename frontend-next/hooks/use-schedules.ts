"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schedulesService } from "@/services/schedules.service";
import type { ScheduleCreate, ScheduleUpdate } from "@/types/schedule";

export const scheduleKeys = {
  all: (includeInactive?: boolean) => ["schedules", includeInactive] as const,
};

export function useSchedules(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: scheduleKeys.all(includeInactive),
    queryFn: () => schedulesService.list(includeInactive),
    enabled,
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
