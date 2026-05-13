from __future__ import annotations

import logging
from typing import Any

from app.core.config import Settings
from app.core.logging import _redact_mapping


def configure_sentry(settings: Settings) -> None:
    if not settings.sentry_dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ModuleNotFoundError as exc:
        raise RuntimeError("SENTRY_DSN is configured but sentry-sdk is not installed.") from exc

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=settings.app_version,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,
        before_send=_before_send,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
    )


def set_sentry_request_context(
    *,
    request_id: str,
    user_id: str | None = None,
    company_id: str | None = None,
) -> None:
    try:
        import sentry_sdk
    except ModuleNotFoundError:
        return

    sentry_sdk.set_tag("request_id", request_id)
    if company_id:
        sentry_sdk.set_tag("company_id", company_id)
    if user_id:
        sentry_sdk.set_user({"id": user_id})
    else:
        sentry_sdk.set_user(None)


def _before_send(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    return _redact_mapping(event)
