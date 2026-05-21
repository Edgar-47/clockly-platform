export interface Schedule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  entry_time: string; // "HH:MM:SS"
  exit_time: string;  // "HH:MM:SS"
  break_minutes: number;
  net_hours: number;
  weekly_hours: number;
  employee_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreate {
  name: string;
  description?: string;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
  entry_time: string;
  exit_time: string;
  break_minutes?: number;
  is_active?: boolean;
}

export interface ScheduleUpdate {
  name?: string;
  description?: string;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
  entry_time?: string;
  exit_time?: string;
  break_minutes?: number;
  is_active?: boolean;
}

export interface ScheduleListResponse {
  items: Schedule[];
  total: number;
}
