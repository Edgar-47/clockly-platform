"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendance.service";
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
    // Data is considered fresh for the same window as the poll interval,
    // preventing a redundant fetch on component mount when data was just loaded.
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useAttendanceHistory(filters: AttendanceHistoryFilters = {}) {
  return useQuery({
    queryKey: attendanceKeys.history(filters),
    queryFn: () => attendanceService.history(filters),
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: ClockRequest) => attendanceService.clockIn(payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: attendanceKeys.current }),
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: ClockRequest) => attendanceService.clockOut(payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: attendanceKeys.current }),
  });
}
