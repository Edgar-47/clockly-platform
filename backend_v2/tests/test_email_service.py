from datetime import UTC, datetime

from app.models.enums import UserRole
from app.services.email_service import (
    CompanyWelcomeEmail,
    EmailService,
    InvitationEmail,
    PasswordResetEmail,
    SensitiveChangeEmail,
    TransactionalEmail,
)


class FakeProvider:
    def __init__(self):
        self.messages: list[TransactionalEmail] = []

    def send(self, message: TransactionalEmail) -> None:
        self.messages.append(message)


def test_email_service_renders_required_templates():
    provider = FakeProvider()
    service = EmailService(provider)
    now = datetime.now(UTC)

    service.send_invitation_email(
        InvitationEmail(
            to_email="invitee@test.com",
            company_name="Acme",
            invited_by_name="Owner",
            role=UserRole.MANAGER,
            acceptance_url="https://app.test/accept/token",
            expires_at=now,
        )
    )
    service.send_password_reset_email(
        PasswordResetEmail(
            to_email="user@test.com",
            full_name="User",
            reset_url="https://app.test/reset/token",
            expires_at=now,
        )
    )
    service.send_company_welcome_email(
        CompanyWelcomeEmail(
            to_email="owner@test.com",
            full_name="Owner",
            company_name="Acme",
            login_url="https://app.test/login",
        )
    )
    service.send_sensitive_change_email(
        SensitiveChangeEmail(
            to_email="user@test.com",
            full_name="User",
            change_name="password_reset",
            occurred_at=now,
        )
    )

    assert len(provider.messages) == 4
    assert "Invitaci" in provider.messages[0].subject
    assert "Restablece" in provider.messages[1].subject
    assert "Bienvenido" in provider.messages[2].subject
    assert "seguridad" in provider.messages[3].subject.lower()
