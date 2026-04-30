from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AttendanceMethod, LateArrivalStatus


class EmployeeSnapshotLA(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    first_name: str
    last_name: str


class ReviewerSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str


class LateArrivalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    employee_id: UUID
    attendance_session_id: UUID
    schedule_id: UUID | None

    date: date
    scheduled_start_time: time
    actual_clock_in_time: time
    delay_minutes_total: int
    delay_minutes_after_grace: int
    grace_period_minutes: int
    clock_in_method: AttendanceMethod | None

    status: LateArrivalStatus
    justification_text: str | None
    internal_notes: str | None

    reviewed_by_user_id: UUID | None
    reviewed_at: datetime | None
    is_session_corrected: bool

    created_at: datetime
    updated_at: datetime

    employee: EmployeeSnapshotLA | None = None
    reviewed_by: ReviewerSnapshot | None = None


class LateArrivalListResponse(BaseModel):
    items: list[LateArrivalRead]
    total: int
    limit: int
    offset: int


class LateArrivalUpdateStatus(BaseModel):
    status: LateArrivalStatus
    justification_text: str | None = Field(default=None, max_length=2000)
    internal_notes: str | None = Field(default=None, max_length=2000)


class LateArrivalStats(BaseModel):
    total_count: int
    pending_count: int
    justified_count: int
    unjustified_count: int
    ignored_count: int
    total_delay_minutes: int
    avg_delay_minutes: float
    punctuality_rate: float  # 0-100 percentage


class LateArrivalChartPoint(BaseModel):
    label: str
    count: int
    total_minutes: int


class LateArrivalEmployeeRank(BaseModel):
    employee_id: UUID
    employee_name: str
    count: int
    total_minutes: int
    avg_minutes: float


class LateArrivalChartsResponse(BaseModel):
    by_day: list[LateArrivalChartPoint]
    by_weekday: list[LateArrivalChartPoint]
    by_month: list[LateArrivalChartPoint]
    top_employees: list[LateArrivalEmployeeRank]
