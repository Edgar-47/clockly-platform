from app.models.enums import UserRole
from app.models.ticket import Ticket
from tests.conftest import auth_headers, make_company, make_employee, make_open_session, make_user


def test_user_can_record_and_list_own_geolocation_consent(client, db):
    company = make_company(db)
    user = make_user(db, company=company, email="employee@test.com", role=UserRole.EMPLOYEE)
    db.commit()

    response = client.post(
        "/gdpr/geolocation-consents",
        headers=auth_headers(user),
        json={
            "consent_type": "geolocation_attendance",
            "consent_version": "2026-04",
            "source": "employee_portal",
            "metadata": {"notice": "attendance_clock_in"},
        },
    )
    assert response.status_code == 200
    assert response.json()["consent_version"] == "2026-04"

    history = client.get("/gdpr/geolocation-consents/me", headers=auth_headers(user))
    assert history.status_code == 200
    assert history.json()["total"] == 1


def test_admin_personal_data_export_includes_attendance_tickets_and_consents(client, db):
    company = make_company(db)
    admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
    user = make_user(db, company=company, email="employee@test.com", role=UserRole.EMPLOYEE)
    employee = make_employee(db, company=company, user=user)
    session = make_open_session(db, company=company, employee=employee, user=user)
    session.clock_in_latitude = 41.387
    session.clock_in_longitude = 2.17
    db.add(
        Ticket(
            company_id=company.id,
            employee_id=employee.id,
            user_id=user.id,
            title="Uniform issue",
        )
    )
    db.commit()

    client.post(
        "/gdpr/geolocation-consents",
        headers=auth_headers(user),
        json={"consent_version": "2026-04", "source": "employee_portal"},
    )

    response = client.get(f"/gdpr/users/{user.id}/export", headers=auth_headers(admin))
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "employee@test.com"
    assert data["employee"]["id"] == str(employee.id)
    assert data["attendance_sessions"][0]["id"] == str(session.id)
    assert data["attendance_sessions"][0]["clock_in_latitude"] == 41.387
    assert data["tickets"][0]["title"] == "Uniform issue"
    assert data["geo_consent_logs"][0]["consent_version"] == "2026-04"


def test_gdpr_export_respects_tenant_isolation(client, db):
    company_a = make_company(db, slug="company-a")
    company_b = make_company(db, slug="company-b")
    admin_a = make_user(db, company=company_a, email="admin@a.test", role=UserRole.ADMIN)
    employee_b = make_employee(db, company=company_b)
    db.commit()

    response = client.get(f"/gdpr/employees/{employee_b.id}/export", headers=auth_headers(admin_a))
    assert response.status_code == 404


def test_employee_cannot_export_other_user_data(client, db):
    company = make_company(db)
    employee_user = make_user(db, company=company, email="employee@test.com", role=UserRole.EMPLOYEE)
    other_user = make_user(db, company=company, email="other@test.com", role=UserRole.EMPLOYEE)
    db.commit()

    response = client.get(f"/gdpr/users/{other_user.id}/export", headers=auth_headers(employee_user))
    assert response.status_code == 403
