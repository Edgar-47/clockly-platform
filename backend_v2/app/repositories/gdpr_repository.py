from __future__ import annotations

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.attendance_session import AttendanceSession
from app.models.employee import Employee
from app.models.geo_consent_log import GeoConsentLog
from app.models.ticket import Ticket
from app.models.user import User


class GDPRRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    def get_user(self, user_id: UUID) -> User | None:
        return self.db.scalar(
            select(User).where(
                User.id == user_id,
                User.company_id == self.company_id,
            )
        )

    def get_employee(self, employee_id: UUID) -> Employee | None:
        return self.db.scalar(
            select(Employee).where(
                Employee.id == employee_id,
                Employee.company_id == self.company_id,
            )
        )

    def get_employee_by_user_id(self, user_id: UUID) -> Employee | None:
        return self.db.scalar(
            select(Employee).where(
                Employee.user_id == user_id,
                Employee.company_id == self.company_id,
            )
        )

    def list_attendance(self, *, user_id: UUID | None = None, employee_id: UUID | None = None) -> list[AttendanceSession]:
        statement = select(AttendanceSession).where(AttendanceSession.company_id == self.company_id)
        filters = []
        if user_id is not None:
            filters.append(AttendanceSession.user_id == user_id)
            filters.append(AttendanceSession.created_by_user_id == user_id)
            filters.append(AttendanceSession.closed_by_user_id == user_id)
            filters.append(AttendanceSession.corrected_by_user_id == user_id)
        if employee_id is not None:
            filters.append(AttendanceSession.employee_id == employee_id)
        if filters:
            statement = statement.where(or_(*filters))
        return list(self.db.scalars(statement.order_by(AttendanceSession.clock_in.desc())))

    def list_tickets(self, *, user_id: UUID | None = None, employee_id: UUID | None = None) -> list[Ticket]:
        statement = select(Ticket).where(Ticket.company_id == self.company_id)
        filters = []
        if user_id is not None:
            filters.append(Ticket.user_id == user_id)
        if employee_id is not None:
            filters.append(Ticket.employee_id == employee_id)
        if filters:
            statement = statement.where(or_(*filters))
        return list(self.db.scalars(statement.order_by(Ticket.created_at.desc())))

    def list_geo_consents(self, *, user_id: UUID) -> list[GeoConsentLog]:
        return list(
            self.db.scalars(
                select(GeoConsentLog)
                .where(
                    GeoConsentLog.company_id == self.company_id,
                    GeoConsentLog.user_id == user_id,
                )
                .order_by(GeoConsentLog.accepted_at.desc())
            )
        )

    def add_geo_consent(self, consent: GeoConsentLog) -> GeoConsentLog:
        self.db.add(consent)
        self.db.flush()
        return consent
