from functools import lru_cache
from typing import Any

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment driven settings for the standalone API backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        enable_decoding=False,
    )

    app_name: str = Field(default="ClockLy API", validation_alias="CLOCKLY_APP_NAME")
    app_version: str = Field(default="0.1.0", validation_alias=AliasChoices("CLOCKLY_VERSION", "APP_VERSION"))
    environment: str = Field(default="development", validation_alias=AliasChoices("CLOCKLY_ENV", "ENVIRONMENT"))
    debug: bool = Field(default=False, validation_alias="CLOCKLY_DEBUG")
    log_format: str = Field(default="console", validation_alias="CLOCKLY_LOG_FORMAT")
    sentry_dsn: str | None = Field(default=None, validation_alias=AliasChoices("SENTRY_DSN", "CLOCKLY_SENTRY_DSN"))
    sentry_traces_sample_rate: float = Field(default=0.0, validation_alias="CLOCKLY_SENTRY_TRACES_SAMPLE_RATE")
    database_url: str = Field(
        default="postgresql+psycopg://clockly:clockly@localhost:5432/clockly",
        validation_alias=AliasChoices("DATABASE_URL", "CLOCKLY_DATABASE_URL"),
    )
    secret_key: str = Field(default="change-me-in-production", validation_alias="CLOCKLY_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", validation_alias="CLOCKLY_JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=15, validation_alias="CLOCKLY_ACCESS_TOKEN_MINUTES")
    refresh_token_expire_days: int = Field(default=30, validation_alias="CLOCKLY_REFRESH_TOKEN_DAYS")
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        validation_alias="CLOCKLY_CORS_ALLOWED_ORIGINS",
    )
    trusted_hosts: list[str] = Field(
        default_factory=lambda: ["localhost", "127.0.0.1", "testserver"],
        validation_alias="CLOCKLY_TRUSTED_HOSTS",
    )
    rate_limit_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices("RATE_LIMIT_ENABLED", "CLOCKLY_RATE_LIMIT_ENABLED"),
    )
    rate_limit_backend: str = Field(default="memory", validation_alias="CLOCKLY_RATE_LIMIT_BACKEND")
    redis_url: str | None = Field(default=None, validation_alias=AliasChoices("REDIS_URL", "CLOCKLY_REDIS_URL"))
    rate_limit_key_prefix: str = Field(default="clockly:rate-limit", validation_alias="CLOCKLY_RATE_LIMIT_KEY_PREFIX")
    email_provider: str = Field(default="noop", validation_alias="CLOCKLY_EMAIL_PROVIDER")
    email_from: str | None = Field(default=None, validation_alias="CLOCKLY_EMAIL_FROM")
    email_smtp_host: str | None = Field(default=None, validation_alias="CLOCKLY_EMAIL_SMTP_HOST")
    email_smtp_port: int = Field(default=587, validation_alias="CLOCKLY_EMAIL_SMTP_PORT")
    email_smtp_username: str | None = Field(default=None, validation_alias="CLOCKLY_EMAIL_SMTP_USERNAME")
    email_smtp_password: str | None = Field(default=None, validation_alias="CLOCKLY_EMAIL_SMTP_PASSWORD")
    email_smtp_use_tls: bool = Field(default=True, validation_alias="CLOCKLY_EMAIL_SMTP_USE_TLS")
    email_smtp_timeout_seconds: float = Field(default=10.0, validation_alias="CLOCKLY_EMAIL_SMTP_TIMEOUT_SECONDS")
    email_resend_api_key: str | None = Field(default=None, validation_alias="CLOCKLY_EMAIL_RESEND_API_KEY")
    email_resend_api_url: str = Field(default="https://api.resend.com/emails", validation_alias="CLOCKLY_EMAIL_RESEND_API_URL")
    stripe_secret_key: str | None = Field(default=None, validation_alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str | None = Field(default=None, validation_alias="STRIPE_WEBHOOK_SECRET")
    stripe_price_pro: str | None = Field(default=None, validation_alias="STRIPE_PRICE_PRO")
    stripe_price_business: str | None = Field(default=None, validation_alias="STRIPE_PRICE_BUSINESS")
    billing_success_url: str = Field(
        default="http://localhost:3000/settings?billing=success",
        validation_alias="CLOCKLY_BILLING_SUCCESS_URL",
    )
    billing_cancel_url: str = Field(
        default="http://localhost:3000/upgrade?billing=cancelled",
        validation_alias="CLOCKLY_BILLING_CANCEL_URL",
    )

    @field_validator("cors_allowed_origins", "trusted_hosts", mode="before")
    @classmethod
    def parse_csv_list(cls, value: Any) -> Any:
        if isinstance(value, str):
            if not value.strip():
                return []
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        clean = value.strip()
        if clean.startswith("postgres://"):
            return "postgresql+psycopg://" + clean.removeprefix("postgres://")
        if clean.startswith("postgresql://"):
            return "postgresql+psycopg://" + clean.removeprefix("postgresql://")
        return clean

    @field_validator("rate_limit_backend", "email_provider", "log_format")
    @classmethod
    def normalize_lowercase_setting(cls, value: str) -> str:
        return value.strip().lower()

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.rate_limit_backend not in {"memory", "redis"}:
            raise ValueError("CLOCKLY_RATE_LIMIT_BACKEND must be 'memory' or 'redis'.")
        if self.log_format not in {"console", "json"}:
            raise ValueError("CLOCKLY_LOG_FORMAT must be 'console' or 'json'.")
        if self.email_provider not in {"noop", "smtp", "resend", "sendgrid", "mailgun"}:
            raise ValueError("CLOCKLY_EMAIL_PROVIDER must be 'noop', 'smtp', 'resend', 'sendgrid', or 'mailgun'.")
        if self.email_provider != "noop" and not self.email_from:
            raise ValueError("CLOCKLY_EMAIL_FROM must be set when transactional email is enabled.")
        if self.email_provider == "smtp" and not self.email_smtp_host:
            raise ValueError("CLOCKLY_EMAIL_SMTP_HOST must be set when CLOCKLY_EMAIL_PROVIDER=smtp.")
        if self.email_provider == "resend" and not self.email_resend_api_key:
            raise ValueError("CLOCKLY_EMAIL_RESEND_API_KEY must be set when CLOCKLY_EMAIL_PROVIDER=resend.")
        if self.environment.lower() == "production":
            if self.secret_key in {"", "change-me-in-production"}:
                raise ValueError("CLOCKLY_SECRET_KEY must be set in production.")
            if "*" in self.cors_allowed_origins:
                raise ValueError("CLOCKLY_CORS_ALLOWED_ORIGINS cannot contain '*' in production.")
            if not self.trusted_hosts or "*" in self.trusted_hosts:
                raise ValueError("CLOCKLY_TRUSTED_HOSTS must be explicit in production.")
            if not self.rate_limit_enabled:
                raise ValueError("CLOCKLY_RATE_LIMIT_ENABLED cannot be false in production.")
            if self.rate_limit_backend != "redis":
                raise ValueError("CLOCKLY_RATE_LIMIT_BACKEND must be 'redis' in production.")
            if self.rate_limit_backend == "redis" and not self.redis_url:
                raise ValueError("CLOCKLY_REDIS_URL must be set when CLOCKLY_RATE_LIMIT_BACKEND=redis.")
            if self.email_provider == "noop":
                raise ValueError("CLOCKLY_EMAIL_PROVIDER must be configured in production.")
            if not self.stripe_secret_key:
                raise ValueError("STRIPE_SECRET_KEY must be set in production.")
            if not self.stripe_webhook_secret:
                raise ValueError("STRIPE_WEBHOOK_SECRET must be set in production.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
