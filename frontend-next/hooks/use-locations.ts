"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { locationsService } from "@/services/locations.service";
import type { AttendanceLocationFilters } from "@/services/locations.service";
import type { WorkLocationCreate, WorkLocationUpdate } from "@/types/location";

export const locationKeys = {
  workLocations: (includeInactive?: boolean) => ["locations", "work", includeInactive] as const,
  events: (filters: AttendanceLocationFilters) => ["locations", "events", filters] as const,
  latest: ["locations", "latest"] as const,
  summary: (filters: object) => ["locations", "summary", filters] as const,
};

export function useWorkLocations(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: locationKeys.workLocations(includeInactive),
    queryFn: () => locationsService.list(includeInactive),
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateWorkLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkLocationCreate) => locationsService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations", "work"] }),
  });
}

export function useUpdateWorkLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkLocationUpdate }) =>
      locationsService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations", "work"] }),
  });
}

export function useDeleteWorkLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => locationsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations", "work"] }),
  });
}

export function useAttendanceLocationEvents(filters: AttendanceLocationFilters = {}) {
  return useQuery({
    queryKey: locationKeys.events(filters),
    queryFn: () => locationsService.attendanceEvents(filters),
    staleTime: 30_000,
  });
}

export function useLatestLocations() {
  return useQuery({
    queryKey: locationKeys.latest,
    queryFn: () => locationsService.latestLocations(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useLocationSummary(
  filters: Pick<AttendanceLocationFilters, "date_from" | "date_to" | "employee_id"> = {},
) {
  return useQuery({
    queryKey: locationKeys.summary(filters),
    queryFn: () => locationsService.summary(filters),
    staleTime: 60_000,
  });
}
