from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.core.security import hash_pin
from app.models.company import Company
from app.models.company_settings import CompanySettings
from app.models.employee import Employee
from app.models.user import User
from app.repositories.company_repository import CompanyRepository
from app.repositories.company_settings_repository import CompanySettingsRepository
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.employee import EmployeeCreate
from app.schemas.onboarding import (
    OnboardingCompanyUpdate,
    OnboardingFirstEmployeeCreate,
    OnboardingStatusResponse,
)
from app.services.audit_log import AuditLogService
from app.services.employee_service import EmployeeService


class OnboardingService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.settings = CompanySettingsRepository(db, company_id=company_id)
        self.employees = EmployeeRepository(db, company_id=company_id)

    def status(self) -> OnboardingStatusResponse:
        company = self._company()
        settings = self.settings.get_or_create()
        return self._status_payload(company, settings)

    def update_company(self, payload: OnboardingCompanyUpdate, *, actor: User) -> OnboardingStatusResponse:
        company = self._company()
        settings = self.settings.get_or_create()
        company.name = payload.company_name
        company.timezone = payload.timezone
        if payload.sector is not None:
            company.sector = payload.sector
        if payload.company_size is not None:
            company.company_size = payload.company_size
        if payload.country is not None:
            company.country = payload.country
        settings.onboarding_step = _next_step(settings, "employee")
        self.db.add(company)
        self.db.add(settings)
        AuditLogService(self.db).record(
            "onboarding.company_updated",
            company_id=self.company_id,
            actor_user_id=actor.id,
            resource_type="company",
            resource_id=str(company.id),
            metadata={"plan_type": company.plan_type.value, "timezone": company.timezone},
        )
        self.db.commit()
        return self._status_payload(company, settings)

    def create_first_employee(
        self,
        payload: OnboardingFirstEmployeeCreate,
        *,
        actor: User,
    ) -> tuple[Employee, OnboardingStatusResponse]:
        employee = EmployeeService(self.db, company_id=self.company_id).create_employee(
            EmployeeCreate(
                first_name=payload.first_name,
                last_name=payload.last_name,
                email=payload.email,
                role_title=payload.role_title,
                pin=payload.pin,
                is_active=True,
            ),
            actor_user_id=actor.id,
        )
        settings = self.settings.get_or_create()
        now = datetime.now(UTC)
        settings.first_employee_created_at = settings.first_employee_created_at or now
        if payload.pin:
            settings.kiosk_pin_configured_at = settings.kiosk_pin_configured_at or now
        settings.onboarding_step = _next_step(settings, "kiosk")
        self.db.add(settings)
        AuditLogService(self.db).record(
            "onboarding.first_employee_created",
            company_id=self.company_id,
            actor_user_id=actor.id,
            resource_type="employee",
            resource_id=str(employee.id),
        )
        self.db.commit()
        self.db.refresh(employee)
        return employee, self.status()

    def configure_kiosk_pin(
        self,
        *,
        employee_id: UUID,
        pin: str,
        actor: User,
    ) -> OnboardingStatusResponse:
        employee = self.employees.get(employee_id)
        if employee is None:
            raise NotFoundError("Employee not found.")
        employee.pin_hash = hash_pin(pin)
        settings = self.settings.get_or_create()
        settings.kiosk_pin_configured_at = settings.kiosk_pin_configured_at or datetime.now(UTC)
        settings.onboarding_step = _next_step(settings, "invitations")
        self.db.add(employee)
        self.db.add(settings)
        AuditLogService(self.db).record(
            "onboarding.kiosk_pin_configured",
            company_id=self.company_id,
            actor_user_id=actor.id,
            resource_type="employee",
            resource_id=str(employee.id),
        )
        self.db.commit()
        return self.status()

    def mark_invitations_done(self, *, actor: User) -> OnboardingStatusResponse:
        settings = self.settings.get_or_create()
        settings.invitations_completed_at = settings.invitations_completed_at or datetime.now(UTC)
        settings.onboarding_step = _next_step(settings, "complete")
        self.db.add(settings)
        AuditLogService(self.db).record(
            "onboarding.invitations_done",
            company_id=self.company_id,
            actor_user_id=actor.id,
            resource_type="company_settings",
            resource_id=str(settings.id),
        )
        self.db.commit()
        return self.status()

    def complete(self, *, actor: User) -> OnboardingStatusResponse:
        settings = self.settings.get_or_create()
        status = self._status_payload(self._company(), settings)
        if status.employee_count < 1:
            raise ConflictError("Create at least one employee before completing onboarding.")
        if not status.has_kiosk_pin:
            raise ConflictError("Configure at least one kiosk PIN before completing onboarding.")
        settings.onboarding_completed_at = settings.onboarding_completed_at or datetime.now(UTC)
        settings.onboarding_step = "complete"
        self.db.add(settings)
        AuditLogService(self.db).record(
            "onboarding.completed",
            company_id=self.company_id,
            actor_user_id=actor.id,
            resource_type="company_settings",
            resource_id=str(settings.id),
        )
        self.db.commit()
        return self.status()

    def _company(self) -> Company:
        company = CompanyRepository(self.db).get(self.company_id)
        if company is None:
            raise NotFoundError("Company not found.")
        return company

    def _status_payload(self, company: Company, settings: CompanySettings) -> OnboardingStatusResponse:
        employees = self.employees.list(include_inactive=False)
        return OnboardingStatusResponse(
            company_id=company.id,
            company_name=company.name,
            timezone=company.timezone,
            plan_type=company.plan_type,
            onboarding_step=settings.onboarding_step,
            onboarding_completed_at=settings.onboarding_completed_at,
            first_employee_created_at=settings.first_employee_created_at,
            kiosk_pin_configured_at=settings.kiosk_pin_configured_at,
            invitations_completed_at=settings.invitations_completed_at,
            employee_count=len(employees),
            has_kiosk_pin=any(bool(employee.pin_hash) for employee in employees),
        )


def _next_step(settings: CompanySettings, proposed: str) -> str:
    if settings.onboarding_completed_at is not None:
        return "complete"
    order = {"company": 0, "employee": 1, "kiosk": 2, "invitations": 3, "complete": 4}
    current_rank = order.get(settings.onboarding_step, 0)
    proposed_rank = order[proposed]
    return proposed if proposed_rank > current_rank else settings.onboarding_step
