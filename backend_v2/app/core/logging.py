from __future__ import annotations

import logging as stdlib_logging
from collections.abc import Mapping
from typing import Any

import structlog
from structlog.contextvars import bind_contextvars, clear_contextvars, merge_contextvars

from app.core.config import Settings


SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "password",
    "password_hash",
    "pin",
    "pin_hash",
    "refresh_token",
    "access_token",
    "token",
    "token_hash",
    "secret",
    "api_key",
    "stripe_secret_key",
    "sentry_dsn",
}

LOCATION_KEYS = {
    "latitude",
    "longitude",
    "clock_in_latitude",
    "clock_in_longitude",
    "clock_out_latitude",
    "clock_out_longitude",
}


def configure_logging(settings: Settings) -> None:
    stdlib_logging.basicConfig(level=stdlib_logging.INFO, format="%(message)s")
    renderer = (
        structlog.processors.JSONRenderer()
        if settings.environment.lower() == "production" or settings.log_format == "json"
        else structlog.dev.ConsoleRenderer(colors=False)
    )
    structlog.configure(
        processors=[
            merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            redact_sensitive_event,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(stdlib_logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def bind_request_context(
    *,
    request_id: str,
    user_id: str | None = None,
    company_id: str | None = None,
) -> None:
    clear_contextvars()
    values: dict[str, str] = {"request_id": request_id}
    if user_id:
        values["user_id"] = user_id
    if company_id:
        values["company_id"] = company_id
    bind_contextvars(**values)


def clear_request_context() -> None:
    clear_contextvars()


def redact_sensitive_event(_: Any, __: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    return _redact_mapping(event_dict)


def _redact_mapping(payload: Mapping[str, Any]) -> dict[str, Any]:
    redacted: dict[str, Any] = {}
    for key, value in payload.items():
        normalized = key.lower()
        if normalized in SENSITIVE_KEYS or normalized.endswith("_token") or normalized.endswith("_secret"):
            redacted[key] = "[redacted]"
        elif normalized in LOCATION_KEYS:
            redacted[key] = "[redacted_location]"
        elif isinstance(value, Mapping):
            redacted[key] = _redact_mapping(value)
        elif isinstance(value, list):
            redacted[key] = [_redact_mapping(item) if isinstance(item, Mapping) else item for item in value]
        else:
            redacted[key] = value
    return redacted
