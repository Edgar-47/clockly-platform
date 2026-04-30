from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel


class DailyTrend(BaseModel):
    date: date
    worked_seconds: int
    sessions_count: int


class TrendsResponse(BaseModel):
    period: str
    data: list[DailyTrend]
    total_worked_seconds: int
    avg_daily_seconds: int
    peak_day: date | None
    peak_seconds: int
    comparison_pct: float | None  # vs previous same-length period, None if no data


class PunctualityEmployee(BaseModel):
    employee_id: UUID
    employee_name: str
    late_count: int
    on_time_count: int
    total_sessions: int
    punctuality_rate: float  # 0.0–1.0


class PunctualityRanking(BaseModel):
    employees: list[PunctualityEmployee]


class Anomaly(BaseModel):
    employee_id: UUID
    employee_name: str
    anomaly_type: str  # frequent_late | long_session | auto_clockout | no_activity
    count: int
    description: str


class AnomaliesResponse(BaseModel):
    anomalies: list[Anomaly]
    period_days: int
