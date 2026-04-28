"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import type { AutoClockOutSettingsUpdate } from "@/types/settings";

export const settingsKeys = {
  autoClockOut: ["settings", "auto-clock-out"] as const,
};

export function useAutoClockOutSettings(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.autoClockOut,
    queryFn: settingsService.autoClockOut,
    enabled,
  });
}

export function useUpdateAutoClockOutSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AutoClockOutSettingsUpdate) =>
      settingsService.updateAutoClockOut(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.autoClockOut });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
