from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.errors import PermissionDenied
from app.models.user import User
from app.repositories.company_settings_repository import CompanySettingsRepository
from app.schemas.company_settings import AutoClockOutSettingsUpdate
from app.services.audit_log import AuditLogService


class CompanySettingsService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.settings = CompanySettingsRepository(db, company_id=company_id)

    def get_auto_clock_out_settings(self):
        return self.settings.get_or_create()

    def update_auto_clock_out_settings(self, payload: AutoClockOutSettingsUpdate, *, actor: User):
        if "settings:write" not in actor_permissions(actor.role):
            raise PermissionDenied("Insufficient permissions.")

        settings = self.settings.get_or_create()
        settings.auto_clock_out_enabled = payload.auto_clock_out_enabled
        settings.auto_clock_out_time = payload.auto_clock_out_time
        settings.auto_clock_out_timezone = payload.auto_clock_out_timezone or actor.company.timezone
        settings.auto_clock_out_grace_minutes = payload.auto_clock_out_grace_minutes
        settings.auto_clock_out_updated_by_user_id = actor.id
        settings.auto_clock_out_updated_at = datetime.now(UTC)
        self.db.add(settings)
        AuditLogService(self.db).record(
            "settings.auto_clock_out_updated",
            company_id=self.company_id,
            actor_user_id=actor.id,
            resource_type="company_settings",
            resource_id=str(settings.id),
            metadata={
                "enabled": settings.auto_clock_out_enabled,
                "time": settings.auto_clock_out_time.isoformat() if settings.auto_clock_out_time else None,
                "timezone": settings.auto_clock_out_timezone,
                "grace_minutes": settings.auto_clock_out_grace_minutes,
            },
        )
        self.db.commit()
        self.db.refresh(settings)
        return settings


def actor_permissions(role) -> set[str]:
    from app.services.permissions import ROLE_PERMISSIONS

    return ROLE_PERMISSIONS.get(role, set())
