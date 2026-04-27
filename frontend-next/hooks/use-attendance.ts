"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendance.service";
import { useGeolocation } from "@/hooks/use-geolocation";
import type {
  AttendanceHistoryFilters,
  AttendanceStatus,
  ClockRequest,
} from "@/types/attendance";

export const attendanceKeys = {
  current: ["attendance", "current"] as const,
  history: (filters: AttendanceHistoryFilters) =>
    ["attendance", "history", filters] as const,
};

export function useCurrentAttendance() {
  return useQuery<AttendanceStatus[]>({
    queryKey: attendanceKeys.current,
    queryFn: () => attendanceService.current(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useAttendanceHistory(filters: AttendanceHistoryFilters = {}) {
  return useQuery({
    queryKey: attendanceKeys.history(filters),
    queryFn: () => attendanceService.history(filters),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  const { capture } = useGeolocation();
  return useMutation({
    mutationFn: async (payload?: ClockRequest) => {
      const geo = await capture();
      return attendanceService.clockIn({ ...payload, ...geo });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  const { capture } = useGeolocation();
  return useMutation({
    mutationFn: async (payload?: ClockRequest) => {
      const geo = await capture();
      return attendanceService.clockOut({ ...payload, ...geo });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}
