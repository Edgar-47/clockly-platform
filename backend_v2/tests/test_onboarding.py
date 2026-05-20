from urllib.parse import urlparse

from app.dependencies.email import get_email_service
from app.main import app
from app.models.company import Company
from app.models.company_settings import CompanySettings
from app.models.employee import Employee
from app.models.enums import PlanType, UserRole
from app.models.user import User


class RecordingEmailService:
    def __init__(self) -> None:
        self.invitations = []
        self.password_resets = []

    def send_invitation_email(self, invitation) -> None:
        self.invitations.append(invitation)

    def send_password_reset_email(self, reset) -> None:
        self.password_resets.append(reset)


def _register_payload(**overrides):
    payload = {
        "company_name": "Acme Clinic",
        "owner_email": "owner@acme.test",
        "owner_full_name": "Acme Owner",
        "password": "owner-pass-123",
        "timezone": "UTC",
        "plan_type": "free",
    }
    payload.update(overrides)
    return payload


def _token_from_url(url: str) -> str:
    return urlparse(url).path.rsplit("/", 1)[-1]


class TestCompanyRegistration:
    def test_register_company_creates_tenant_owner_settings_and_session(self, client, db):
        resp = client.post("/auth/register-company", json=_register_payload())

        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "owner"
        assert data["company"]["name"] == "Acme Clinic"
        assert data["company"]["plan_type"] == "free"

        company = db.query(Company).filter_by(slug="acme-clinic").one()
        owner = db.query(User).filter_by(email="owner@acme.test").one()
        settings = db.query(CompanySettings).filter_by(company_id=company.id).one()
        assert owner.company_id == company.id
        assert owner.role == UserRole.OWNER
        assert company.created_by == owner.id
        assert company.plan_type == PlanType.FREE
        assert settings.onboarding_step == "company"

        me = client.get("/auth/me")
        assert me.status_code == 200
        assert me.json()["user"]["email"] == "owner@acme.test"

    def test_register_company_rejects_duplicate_owner_email(self, client, db):
        first = client.post("/auth/register-company", json=_register_payload())
        second = client.post(
            "/auth/register-company",
            json=_register_payload(company_name="Other Co"),
        )

        assert first.status_code == 200
        assert second.status_code == 409

    def test_register_company_rejects_duplicate_company_slug(self, client, db):
        first = client.post("/auth/register-company", json=_register_payload())
        second = client.post(
            "/auth/register-company",
            json=_register_payload(owner_email="other@acme.test"),
        )

        assert first.status_code == 200
        assert second.status_code == 409


class TestPasswordReset:
    def test_password_reset_is_email_backed_single_use_and_does_not_reveal_lookup(self, client, db):
        email_service = RecordingEmailService()
        app.dependency_overrides[get_email_service] = lambda: email_service
        client.post("/auth/register-company", json=_register_payload())
        client.post("/auth/logout")

        unknown = client.post("/auth/request-password-reset", json={"email": "missing@acme.test"})
        known = client.post("/auth/request-password-reset", json={"email": "owner@acme.test"})

        assert unknown.status_code == 200
        assert known.status_code == 200
        assert unknown.json() == known.json()
        assert len(email_service.password_resets) == 1

        token = _token_from_url(email_service.password_resets[0].reset_url)
        reset = client.post("/auth/reset-password", json={"token": token, "password": "new-owner-pass-123"})
        reused = client.post("/auth/reset-password", json={"token": token, "password": "new-owner-pass-123"})

        assert reset.status_code == 200
        assert reused.status_code == 409
        assert client.post("/auth/login", json={"email": "owner@acme.test", "password": "owner-pass-123"}).status_code == 401
        assert client.post("/auth/login", json={"email": "owner@acme.test", "password": "new-owner-pass-123"}).status_code == 200


class TestOnboardingWizard:
    def test_onboarding_company_employee_pin_invites_and_completion(self, client, db):
        email_service = RecordingEmailService()
        app.dependency_overrides[get_email_service] = lambda: email_service
        register = client.post("/auth/register-company", json=_register_payload())
        assert register.status_code == 200

        company = client.put(
            "/onboarding/company",
            json={"company_name": "Acme Clinic Madrid", "timezone": "Europe/Madrid"},
        )
        employee = client.post(
            "/onboarding/first-employee",
            json={
                "first_name": "First",
                "last_name": "Employee",
                "email": "first@acme.test",
                "role_title": "Recepcion",
                "pin": "1234",
            },
        )
        invitation = client.post(
            "/onboarding/invitations",
            json={"email": "manager@acme.test", "role": "manager"},
        )
        complete = client.post("/onboarding/complete")

        assert company.status_code == 200
        assert company.json()["plan_type"] == "free"
        assert employee.status_code == 201
        assert invitation.status_code == 201
        assert complete.status_code == 200
        assert complete.json()["status"]["onboarding_step"] == "complete"
        assert complete.json()["status"]["has_kiosk_pin"] is True
        assert len(email_service.invitations) == 1
        assert db.query(Employee).filter_by(email="first@acme.test").one().company_id == db.query(Company).one().id

    def test_onboarding_completion_requires_employee_and_kiosk_pin(self, client, db):
        register = client.post("/auth/register-company", json=_register_payload())
        assert register.status_code == 200

        complete = client.post("/onboarding/complete")

        assert complete.status_code == 409
