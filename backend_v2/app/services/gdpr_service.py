from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, PermissionDenied
from app.models.attendance_session import AttendanceSession
from app.models.employee import Employee
from app.models.geo_consent_log import GeoConsentLog
from app.models.ticket import Ticket
from app.models.user import User
from app.repositories.gdpr_repository import GDPRRepository
from app.schemas.gdpr import GeoConsentCreate
from app.services.permissions import is_admin_role


class GDPRService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.repo = GDPRRepository(db, company_id=company_id)

    def record_geo_consent(
        self,
        payload: GeoConsentCreate,
        *,
        actor: User,
        ip_address: str | None,
        user_agent: str | None,
    ) -> GeoConsentLog:
        consent = GeoConsentLog(
            company_id=self.company_id,
            user_id=actor.id,
            consent_type=payload.consent_type,
            consent_version=payload.consent_version,
            accepted_at=datetime.now(UTC),
            ip_address=ip_address,
            user_agent=user_agent,
            source=payload.source,
            metadata_json=payload.metadata,
        )
        self.repo.add_geo_consent(consent)
        self.db.commit()
        return consent

    def list_geo_consents_for_user(self, user_id: UUID, *, actor: User) -> list[GeoConsentLog]:
        if actor.id != user_id and not is_admin_role(actor.role):
            raise PermissionDenied("You cannot read consent logs for this user.")
        user = self.repo.get_user(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        return self.repo.list_geo_consents(user_id=user_id)

    def export_for_current_user(self, *, actor: User) -> dict[str, Any]:
        employee = self.repo.get_employee_by_user_id(actor.id)
        return self._build_export(user=actor, employee=employee, requested_by=actor)

    def export_user(self, user_id: UUID, *, actor: User) -> dict[str, Any]:
        if not is_admin_role(actor.role):
            raise PermissionDenied("Admin access required.")
        user = self.repo.get_user(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        employee = self.repo.get_employee_by_user_id(user.id)
        return self._build_export(user=user, employee=employee, requested_by=actor)

    def export_employee(self, employee_id: UUID, *, actor: User) -> dict[str, Any]:
        if not is_admin_role(actor.role):
            raise PermissionDenied("Admin access required.")
        employee = self.repo.get_employee(employee_id)
        if employee is None:
            raise NotFoundError("Employee not found.")
        user = self.repo.get_user(employee.user_id) if employee.user_id else None
        return self._build_export(user=user, employee=employee, requested_by=actor)

    def _build_export(
        self,
        *,
        user: User | None,
        employee: Employee | None,
        requested_by: User,
    ) -> dict[str, Any]:
        user_id = user.id if user else None
        employee_id = employee.id if employee else None
        attendance = self.repo.list_attendance(user_id=user_id, employee_id=employee_id)
        tickets = self.repo.list_tickets(user_id=user_id, employee_id=employee_id)
        consents = self.repo.list_geo_consents(user_id=user_id) if user_id else []

        return {
            "exported_at": datetime.now(UTC),
            "format": "json",
            "company_id": self.company_id,
            "requested_by_user_id": requested_by.id,
            "subject": {
                "user_id": user_id,
                "employee_id": employee_id,
            },
            "user": _user_payload(user) if user else None,
            "employee": _employee_payload(employee) if employee else None,
            "attendance_sessions": [_attendance_payload(session) for session in attendance],
            "tickets": [_ticket_payload(ticket) for ticket in tickets],
            "geo_consent_logs": [_consent_payload(consent) for consent in consents],
            "metadata": {
                "contains_geolocation": any(
                    session.clock_in_latitude is not None
                    or session.clock_in_longitude is not None
                    or session.clock_out_latitude is not None
                    or session.clock_out_longitude is not None
                    for session in attendance
                ),
                "future_formats": ["zip", "csv", "pdf"],
            },
        }


def _user_payload(user: User) -> dict[str, Any]:
    return _clean(
        {
            "id": user.id,
            "company_id": user.company_id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "is_deleted": user.is_deleted,
            "deleted_at": user.deleted_at,
            "deleted_by": user.deleted_by,
            "last_login_at": user.last_login_at,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        }
    )


def _employee_payload(employee: Employee) -> dict[str, Any]:
    return _clean(
        {
            "id": employee.id,
            "company_id": employee.company_id,
            "user_id": employee.user_id,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "full_name": employee.full_name,
            "email": employee.email,
            "phone": employee.phone,
            "dni": employee.dni,
            "role_title": employee.role_title,
            "hired_on": employee.hired_on,
            "is_active": employee.is_active,
            "is_deleted": employee.is_deleted,
            "deleted_at": employee.deleted_at,
            "deleted_by": employee.deleted_by,
            "created_at": employee.created_at,
            "updated_at": employee.updated_at,
        }
    )


def _attendance_payload(session: AttendanceSession) -> dict[str, Any]:
    return _clean(
        {
            "id": session.id,
            "company_id": session.company_id,
            "employee_id": session.employee_id,
            "user_id": session.user_id,
            "clock_in": session.clock_in,
            "clock_out": session.clock_out,
            "duration_seconds": session.duration_seconds,
            "status": session.status,
            "method": session.method,
            "notes": session.notes,
            "created_by_user_id": session.created_by_user_id,
            "closed_by_user_id": session.closed_by_user_id,
            "corrected_by_user_id": session.corrected_by_user_id,
            "corrected_at": session.corrected_at,
            "is_corrected": session.is_corrected,
            "auto_closed": session.auto_closed,
            "clock_out_source": session.clock_out_source,
            "has_incident": session.has_incident,
            "incident_type": session.incident_type,
            "closed_automatically_at": session.closed_automatically_at,
            "clock_in_latitude": session.clock_in_latitude,
            "clock_in_longitude": session.clock_in_longitude,
            "clock_in_accuracy_meters": session.clock_in_accuracy_meters,
            "clock_in_location_status": session.clock_in_location_status,
            "clock_in_distance_meters": session.clock_in_distance_meters,
            "clock_out_latitude": session.clock_out_latitude,
            "clock_out_longitude": session.clock_out_longitude,
            "clock_out_accuracy_meters": session.clock_out_accuracy_meters,
            "clock_out_location_status": session.clock_out_location_status,
            "clock_out_distance_meters": session.clock_out_distance_meters,
            "location_source": session.location_source,
            "location_permission_status": session.location_permission_status,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
        }
    )


def _ticket_payload(ticket: Ticket) -> dict[str, Any]:
    return _clean(
        {
            "id": ticket.id,
            "company_id": ticket.company_id,
            "employee_id": ticket.employee_id,
            "user_id": ticket.user_id,
            "title": ticket.title,
            "description": ticket.description,
            "status": ticket.status,
            "occurred_on": ticket.occurred_on,
            "attachment_key": ticket.attachment_key,
            "created_at": ticket.created_at,
            "updated_at": ticket.updated_at,
        }
    )


def _consent_payload(consent: GeoConsentLog) -> dict[str, Any]:
    return _clean(
        {
            "id": consent.id,
            "company_id": consent.company_id,
            "user_id": consent.user_id,
            "consent_type": consent.consent_type,
            "consent_version": consent.consent_version,
            "accepted_at": consent.accepted_at,
            "revoked_at": consent.revoked_at,
            "ip_address": consent.ip_address,
            "user_agent": consent.user_agent,
            "source": consent.source,
            "metadata": consent.metadata_json,
            "created_at": consent.created_at,
            "updated_at": consent.updated_at,
        }
    )


def _clean(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _clean(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_clean(item) for item in value]
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    return value
