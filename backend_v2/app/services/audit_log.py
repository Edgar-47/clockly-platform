from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


class AuditLogService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record(
        self,
        action: str,
        *,
        company_id: UUID | None = None,
        actor_user_id: UUID | None = None,
        resource_type: str | None = None,
        resource_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        ip_address: str | None = None,
        commit: bool = False,
    ) -> AuditLog:
        entry = AuditLog(
            company_id=company_id,
            actor_user_id=actor_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=metadata,
            ip_address=ip_address,
        )
        self.db.add(entry)
        if commit:
            self.db.commit()
        return entry

    def safe_record(self, action: str, **kwargs: Any) -> None:
        try:
            self.record(action, **kwargs)
        except SQLAlchemyError:
            self.db.rollback()
