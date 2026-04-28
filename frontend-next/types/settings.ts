export interface AutoClockOutSettings {
  company_id: string;
  auto_clock_out_enabled: boolean;
  auto_clock_out_time: string | null;
  auto_clock_out_timezone: string | null;
  auto_clock_out_grace_minutes: number;
  auto_clock_out_updated_by_user_id: string | null;
  auto_clock_out_updated_at: string | null;
  updated_at: string;
}

export interface AutoClockOutSettingsUpdate {
  auto_clock_out_enabled: boolean;
  auto_clock_out_time: string | null;
  auto_clock_out_timezone?: string | null;
  auto_clock_out_grace_minutes: number;
}
