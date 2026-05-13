from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.core.timezones import ensure_utc
from app.models.attendance_session import AttendanceSession
from app.models.enums import AttendanceStatus, ClockOutSource
from app.repositories.attendance_repository import AttendanceRepository
from app.repositories.company_repository import CompanyRepository


class ExportService:
    """Prepared backend-side export query surface.

    Rendering XLSX/CSV/PDF can build on this without duplicating report queries.
    """

    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.company = CompanyRepository(db).get(company_id)
        if self.company is None:
            raise NotFoundError("Company not found.")
        self.attendance = AttendanceRepository(db, company_id=company_id)

    def list_exportable_sessions(
        self,
        *,
        employee_id: UUID | None = None,
        status: AttendanceStatus | None = AttendanceStatus.CLOSED,
        clock_out_source: ClockOutSource | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[AttendanceSession]:
        date_from_utc = ensure_utc(date_from, default_timezone=self.company.timezone) if date_from else None
        date_to_utc = ensure_utc(date_to, default_timezone=self.company.timezone) if date_to else None
        return self.attendance.list_sessions(
            employee_id=employee_id,
            status=status,
            clock_out_source=clock_out_source,
            date_from=date_from_utc,
            date_to=date_to_utc,
            limit=10_000,
        )
