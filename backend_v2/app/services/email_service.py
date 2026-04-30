from __future__ import annotations

import logging
import smtplib
from dataclasses import dataclass, field
from datetime import datetime
from email.message import EmailMessage
from typing import Protocol

from app.core.config import Settings, get_settings
from app.models.enums import UserRole

logger = logging.getLogger(__name__)


class EmailSendError(RuntimeError):
    """Raised when a transactional email provider cannot send a message."""


@dataclass(frozen=True)
class TransactionalEmail:
    to_email: str
    subject: str
    text_body: str
    html_body: str | None = field(default=None)


@dataclass(frozen=True)
class InvitationEmail:
    to_email: str
    company_name: str
    invited_by_name: str
    role: UserRole
    acceptance_url: str
    expires_at: datetime


@dataclass(frozen=True)
class PasswordResetEmail:
    to_email: str
    full_name: str
    reset_url: str
    expires_at: datetime


@dataclass(frozen=True)
class CompanyWelcomeEmail:
    to_email: str
    full_name: str
    company_name: str
    login_url: str


@dataclass(frozen=True)
class SensitiveChangeEmail:
    to_email: str
    full_name: str
    change_name: str
    occurred_at: datetime


@dataclass(frozen=True)
class WeeklySummaryEmail:
    to_email: str
    full_name: str
    company_name: str
    week_label: str
    total_hours: float
    session_count: int
    dashboard_url: str


@dataclass(frozen=True)
class MissedClockoutEmail:
    to_email: str
    full_name: str
    company_name: str
    clock_in_at: datetime
    dashboard_url: str


class EmailProvider(Protocol):
    def send(self, message: TransactionalEmail) -> None:
        ...


class NoopEmailProvider:
    def __init__(self, *, include_body_in_logs: bool = False) -> None:
        self.include_body_in_logs = include_body_in_logs

    def send(self, message: TransactionalEmail) -> None:
        extra: dict = {"to_email": message.to_email, "subject": message.subject}
        if self.include_body_in_logs:
            extra["text_body"] = message.text_body
        logger.info(
            "Transactional email suppressed by noop provider.",
            extra=extra,
        )


class SMTPEmailProvider:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        username: str | None,
        password: str | None,
        use_tls: bool,
        timeout_seconds: float,
        from_email: str,
    ) -> None:
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.timeout_seconds = timeout_seconds
        self.from_email = from_email

    def send(self, message: TransactionalEmail) -> None:
        email = EmailMessage()
        email["From"] = self.from_email
        email["To"] = message.to_email
        email["Subject"] = message.subject
        email.set_content(message.text_body)
        if message.html_body:
            email.add_alternative(message.html_body, subtype="html")

        try:
            with smtplib.SMTP(self.host, self.port, timeout=self.timeout_seconds) as client:
                if self.use_tls:
                    client.starttls()
                if self.username:
                    client.login(self.username, self.password or "")
                client.send_message(email)
        except (OSError, smtplib.SMTPException) as exc:
            raise EmailSendError("Transactional email provider failed to send.") from exc


class ResendEmailProvider:
    def __init__(
        self,
        *,
        api_key: str,
        api_url: str,
        from_email: str,
        timeout_seconds: float,
    ) -> None:
        self.api_key = api_key
        self.api_url = api_url
        self.from_email = from_email
        self.timeout_seconds = timeout_seconds

    def send(self, message: TransactionalEmail) -> None:
        try:
            import httpx

            payload: dict = {
                "from": self.from_email,
                "to": [message.to_email],
                "subject": message.subject,
                "text": message.text_body,
            }
            if message.html_body:
                payload["html"] = message.html_body

            response = httpx.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
        except Exception as exc:
            raise EmailSendError("Resend email provider failed to send.") from exc


class UnsupportedEmailProvider:
    def __init__(self, provider_name: str) -> None:
        self.provider_name = provider_name

    def send(self, message: TransactionalEmail) -> None:
        raise EmailSendError(
            f"CLOCKLY_EMAIL_PROVIDER={self.provider_name} is reserved for a future provider adapter."
        )


class EmailService:
    def __init__(self, provider: EmailProvider) -> None:
        self.provider = provider

    @classmethod
    def from_settings(cls, settings: Settings | None = None) -> "EmailService":
        settings = settings or get_settings()
        provider = settings.email_provider
        if provider == "noop":
            return cls(NoopEmailProvider(include_body_in_logs=settings.environment.lower() != "production"))
        if provider == "smtp":
            if not settings.email_from or not settings.email_smtp_host:
                raise EmailSendError("SMTP email provider is missing required configuration.")
            return cls(
                SMTPEmailProvider(
                    host=settings.email_smtp_host,
                    port=settings.email_smtp_port,
                    username=settings.email_smtp_username,
                    password=settings.email_smtp_password,
                    use_tls=settings.email_smtp_use_tls,
                    timeout_seconds=settings.email_smtp_timeout_seconds,
                    from_email=settings.email_from,
                )
            )
        if provider == "resend":
            if not settings.email_from or not settings.email_resend_api_key:
                raise EmailSendError("Resend email provider is missing required configuration.")
            return cls(
                ResendEmailProvider(
                    api_key=settings.email_resend_api_key,
                    api_url=settings.email_resend_api_url,
                    from_email=settings.email_from,
                    timeout_seconds=settings.email_smtp_timeout_seconds,
                )
            )
        return cls(UnsupportedEmailProvider(provider))

    def send_invitation_email(self, invitation: InvitationEmail) -> None:
        from app.services.email_templates import invitation_email as build
        subject, text_body, html_body = build(
            to_email=invitation.to_email,
            company_name=invitation.company_name,
            invited_by_name=invitation.invited_by_name,
            role=invitation.role,
            acceptance_url=invitation.acceptance_url,
            expires_at=invitation.expires_at,
        )
        self.provider.send(TransactionalEmail(
            to_email=invitation.to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        ))

    def send_password_reset_email(self, reset: PasswordResetEmail) -> None:
        from app.services.email_templates import password_reset_email as build
        subject, text_body, html_body = build(
            to_email=reset.to_email,
            full_name=reset.full_name,
            reset_url=reset.reset_url,
            expires_at=reset.expires_at,
        )
        self.provider.send(TransactionalEmail(
            to_email=reset.to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        ))

    def send_company_welcome_email(self, welcome: CompanyWelcomeEmail) -> None:
        from app.services.email_templates import company_welcome_email as build
        subject, text_body, html_body = build(
            to_email=welcome.to_email,
            full_name=welcome.full_name,
            company_name=welcome.company_name,
            login_url=welcome.login_url,
        )
        self.provider.send(TransactionalEmail(
            to_email=welcome.to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        ))

    def send_sensitive_change_email(self, change: SensitiveChangeEmail) -> None:
        from app.services.email_templates import sensitive_change_email as build
        subject, text_body, html_body = build(
            to_email=change.to_email,
            full_name=change.full_name,
            change_name=change.change_name,
            occurred_at=change.occurred_at,
        )
        self.provider.send(TransactionalEmail(
            to_email=change.to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        ))

    def send_weekly_summary_email(self, summary: WeeklySummaryEmail) -> None:
        from app.services.email_templates import weekly_summary_email as build
        subject, text_body, html_body = build(
            to_email=summary.to_email,
            full_name=summary.full_name,
            company_name=summary.company_name,
            week_label=summary.week_label,
            total_hours=summary.total_hours,
            session_count=summary.session_count,
            dashboard_url=summary.dashboard_url,
        )
        self.provider.send(TransactionalEmail(
            to_email=summary.to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        ))

    def send_missed_clockout_email(self, missed: MissedClockoutEmail) -> None:
        from app.services.email_templates import missed_clockout_email as build
        subject, text_body, html_body = build(
            to_email=missed.to_email,
            full_name=missed.full_name,
            company_name=missed.company_name,
            clock_in_at=missed.clock_in_at,
            dashboard_url=missed.dashboard_url,
        )
        self.provider.send(TransactionalEmail(
            to_email=missed.to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        ))
