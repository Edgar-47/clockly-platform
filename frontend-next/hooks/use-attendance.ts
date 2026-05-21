"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendance.service";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useMe } from "@/hooks/use-auth";
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
    // Session history is not real-time — it refreshes after mutations and on
    // focus. Polling every 30 s is unnecessary and generates excessive load.
    staleTime: 60_000,
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  const { capture } = useGeolocation();
  const me = useMe();
  return useMutation({
    mutationFn: async (payload?: ClockRequest) => {
      const geo = me.data?.company.has_geolocation ? await capture() : {};
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
  const me = useMe();
  return useMutation({
    mutationFn: async (payload?: ClockRequest) => {
      const geo = me.data?.company.has_geolocation ? await capture() : {};
      return attendanceService.clockOut({ ...payload, ...geo });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useUpdateAttendanceSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { clock_in?: string; clock_out?: string | null; notes?: string | null; mark_corrected?: boolean } }) =>
      attendanceService.updateSession(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useAutoCloseOpenSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { older_than_hours?: number; notes?: string }) => attendanceService.autoCloseOpen(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}
