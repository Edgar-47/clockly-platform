import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface DailyTrend {
  date: string;
  worked_seconds: number;
  sessions_count: number;
}

export interface TrendsResponse {
  period: string;
  data: DailyTrend[];
  total_worked_seconds: number;
  avg_daily_seconds: number;
  peak_day: string | null;
  peak_seconds: number;
  comparison_pct: number | null;
}

export interface PunctualityEmployee {
  employee_id: string;
  employee_name: string;
  late_count: number;
  on_time_count: number;
  total_sessions: number;
  punctuality_rate: number;
}

export interface PunctualityRanking {
  employees: PunctualityEmployee[];
}

export interface Anomaly {
  employee_id: string;
  employee_name: string;
  anomaly_type: "frequent_late" | "long_session" | "auto_clockout";
  count: number;
  description: string;
}

export interface AnomaliesResponse {
  anomalies: Anomaly[];
  period_days: number;
}

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "12m";

export function useAnalyticsTrends(period: AnalyticsPeriod = "30d") {
  return useQuery<TrendsResponse>({
    queryKey: ["analytics", "trends", period],
    queryFn: () => api.get<TrendsResponse>(`/analytics/trends?period=${period}`),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useAnalyticsPunctuality(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const qs = params.toString() ? `?${params}` : "";
  return useQuery<PunctualityRanking>({
    queryKey: ["analytics", "punctuality", dateFrom, dateTo],
    queryFn: () => api.get<PunctualityRanking>(`/analytics/punctuality${qs}`),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useAnalyticsAnomalies(days: number = 30) {
  return useQuery<AnomaliesResponse>({
    queryKey: ["analytics", "anomalies", days],
    queryFn: () => api.get<AnomaliesResponse>(`/analytics/anomalies?days=${days}`),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
