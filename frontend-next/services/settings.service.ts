import { api } from "@/lib/api-client";
import type { AutoClockOutSettings, AutoClockOutSettingsUpdate } from "@/types/settings";

export const settingsService = {
  autoClockOut: () => api.get<AutoClockOutSettings>("/settings/auto-clock-out"),

  updateAutoClockOut: (payload: AutoClockOutSettingsUpdate) =>
    api.put<AutoClockOutSettings>("/settings/auto-clock-out", payload),
};
