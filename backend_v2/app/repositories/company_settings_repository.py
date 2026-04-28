from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company_settings import CompanySettings


class CompanySettingsRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    def get(self) -> CompanySettings | None:
        return self.db.scalar(
            select(CompanySettings).where(CompanySettings.company_id == self.company_id)
        )

    def get_or_create(self) -> CompanySettings:
        settings = self.get()
        if settings is not None:
            return settings
        settings = CompanySettings(company_id=self.company_id)
        self.db.add(settings)
        self.db.flush()
        return settings
