from __future__ import annotations

import logging
import smtplib
from dataclasses import dataclass
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


class EmailProvider(Protocol):
    def send(self, message: TransactionalEmail) -> None:
        ...


class NoopEmailProvider:
    def __init__(self, *, include_body_in_logs: bool = False) -> None:
        self.include_body_in_logs = include_body_in_logs

    def send(self, message: TransactionalEmail) -> None:
        extra = {"to_email": message.to_email, "subject": message.subject}
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

        try:
            with smtplib.SMTP(self.host, self.port, timeout=self.timeout_seconds) as client:
                if self.use_tls:
                    client.starttls()
                if self.username:
                    client.login(self.username, self.password or "")
                client.send_message(email)
        except (OSError, smtplib.SMTPException) as exc:
            raise EmailSendError("Transactional email provider failed to send.") from exc


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
        return cls(UnsupportedEmailProvider(provider))

    def send_invitation_email(self, invitation: InvitationEmail) -> None:
        message = TransactionalEmail(
            to_email=invitation.to_email,
            subject=f"Invitacion a {invitation.company_name} en ClockLy",
            text_body=(
                f"{invitation.invited_by_name} te ha invitado a {invitation.company_name} "
                f"como {invitation.role.value}.\n\n"
                "Acepta la invitacion aqui:\n"
                f"{invitation.acceptance_url}\n\n"
                f"Este enlace caduca el {invitation.expires_at.isoformat()}."
            ),
        )
        self.provider.send(message)

    def send_password_reset_email(self, reset: PasswordResetEmail) -> None:
        message = TransactionalEmail(
            to_email=reset.to_email,
            subject="Restablece tu contrasena de ClockLy",
            text_body=(
                f"Hola {reset.full_name},\n\n"
                "Hemos recibido una solicitud para restablecer tu contrasena de ClockLy.\n"
                "Puedes definir una nueva contrasena aqui:\n"
                f"{reset.reset_url}\n\n"
                f"Este enlace caduca el {reset.expires_at.isoformat()}.\n"
                "Si no has solicitado este cambio, puedes ignorar este email."
            ),
        )
        self.provider.send(message)
