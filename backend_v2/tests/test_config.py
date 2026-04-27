import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _production_settings(**overrides) -> Settings:
    values = {
        "CLOCKLY_ENV": "production",
        "CLOCKLY_SECRET_KEY": "x" * 32,
        "CLOCKLY_CORS_ALLOWED_ORIGINS": ["https://app.clockly.example"],
        "CLOCKLY_TRUSTED_HOSTS": ["api.clockly.example"],
    }
    values.update(overrides)
    return Settings(**values)


def test_production_rejects_disabled_rate_limiting():
    with pytest.raises(ValidationError, match="CLOCKLY_RATE_LIMIT_ENABLED"):
        _production_settings(CLOCKLY_RATE_LIMIT_ENABLED=False)


def test_production_redis_rate_limiting_requires_url():
    with pytest.raises(ValidationError, match="CLOCKLY_REDIS_URL"):
        _production_settings(CLOCKLY_RATE_LIMIT_BACKEND="redis")


def test_smtp_email_requires_sender_and_host():
    with pytest.raises(ValidationError, match="CLOCKLY_EMAIL_FROM"):
        Settings(CLOCKLY_EMAIL_PROVIDER="smtp")

    with pytest.raises(ValidationError, match="CLOCKLY_EMAIL_SMTP_HOST"):
        Settings(
            CLOCKLY_EMAIL_PROVIDER="smtp",
            CLOCKLY_EMAIL_FROM="no-reply@clockly.example",
        )
