from functools import lru_cache

from app.services.email_service import EmailService


@lru_cache
def get_email_service() -> EmailService:
    return EmailService.from_settings()
