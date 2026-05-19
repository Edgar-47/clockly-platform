from app.models.company import Company
from app.models.enums import PlanType
from app.services.plans import apply_plan_to_company


def _payload(*, plan_type: str, suffix: str) -> dict:
    return {
        "company_name": f"Paid Payload {suffix}",
        "owner_email": f"owner-{suffix}@paid-payload.test",
        "owner_full_name": "Paid Payload Owner",
        "password": "owner-pass-123",
        "timezone": "UTC",
        "plan_type": plan_type,
    }


def test_register_company_forces_pro_payload_to_free(client, db):
    response = client.post(
        "/auth/register-company",
        json=_payload(plan_type="pro", suffix="pro"),
    )

    assert response.status_code == 200
    assert response.json()["company"]["plan_type"] == "free"
    company = db.query(Company).filter_by(slug="paid-payload-pro").one()
    assert company.plan_type == PlanType.FREE
    assert company.max_employees == 5
    assert company.has_multi_location is False


def test_register_company_forces_business_payload_to_free(client, db):
    response = client.post(
        "/auth/register-company",
        json=_payload(plan_type="business", suffix="business"),
    )

    assert response.status_code == 200
    assert response.json()["company"]["plan_type"] == "free"
    company = db.query(Company).filter_by(slug="paid-payload-business").one()
    assert company.plan_type == PlanType.FREE
    assert company.max_employees == 5
    assert company.has_multi_location is False


def test_onboarding_company_update_ignores_paid_plan_payload(client, db):
    register = client.post(
        "/auth/register-company",
        json=_payload(plan_type="pro", suffix="onboarding"),
    )
    assert register.status_code == 200

    response = client.put(
        "/onboarding/company",
        json={
            "company_name": "Paid Payload Onboarding",
            "timezone": "Europe/Madrid",
            "plan_type": "business",
        },
    )

    assert response.status_code == 200
    assert response.json()["plan_type"] == "free"
    company = db.query(Company).filter_by(slug="paid-payload-onboarding").one()
    assert company.plan_type == PlanType.FREE
    assert company.has_multi_location is False


def test_onboarding_company_update_preserves_authorized_paid_plan(client, db):
    register = client.post(
        "/auth/register-company",
        json=_payload(plan_type="free", suffix="authorized"),
    )
    assert register.status_code == 200
    company = db.query(Company).filter_by(slug="paid-payload-authorized").one()
    apply_plan_to_company(company, PlanType.PRO)
    db.add(company)
    db.commit()

    response = client.put(
        "/onboarding/company",
        json={
            "company_name": "Paid Payload Authorized",
            "timezone": "Europe/Madrid",
            "plan_type": "business",
        },
    )

    assert response.status_code == 200
    assert response.json()["plan_type"] == "pro"
    db.refresh(company)
    assert company.plan_type == PlanType.PRO
    assert company.has_multi_location is False
