from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.repositories.attendance_repository import AttendanceRepository
from app.schemas.metrics import EmployeeHoursSummary, MetricsOverview


class MetricsService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.attendance = AttendanceRepository(db, company_id=company_id)

    def overview(
        self,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> MetricsOverview:
        # Two queries instead of four:
        # 1. worked_seconds_by_employee — JOIN + GROUP BY (provides per-employee data)
        # 2. get_overview_counts       — UNION ALL of two COUNTs (open sessions + active employees)
        # Total worked_seconds is derived by summing employee_rows, avoiding a redundant SUM query.
        employee_rows = self.attendance.worked_seconds_by_employee(
            date_from=date_from,
            date_to=date_to,
        )
        counts = self.attendance.get_overview_counts()
        return MetricsOverview(
            worked_seconds=sum(row[2] for row in employee_rows),
            open_sessions=counts.open_sessions,
            active_employees=counts.active_employees,
            employees=[
                EmployeeHoursSummary(
                    employee_id=employee_id,
                    employee_name=employee_name,
                    worked_seconds=worked_seconds,
                    closed_sessions=closed_sessions,
                )
                for employee_id, employee_name, worked_seconds, closed_sessions in employee_rows
            ],
        )

