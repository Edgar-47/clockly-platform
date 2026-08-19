from tests.conftest import auth_headers, make_company, make_employee, make_open_session, make_user
from app.models.enums import UserRole
from app.models.refresh_token import RefreshToken
from sqlalchemy import select


def test_soft_delete_employee_excludes_normal_queries_but_keeps_attendance(client, db):
    company = make_company(db)
    admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
    employee_user = make_user(db, company=company, email="employee@test.com", role=UserRole.EMPLOYEE)
    employee = make_employee(db, company=company, user=employee_user)
    session = make_open_session(db, company=company, employee=employee, user=admin)
    db.commit()

    delete_response = client.delete(f"/employees/{employee.id}", headers=auth_headers(admin))
    assert delete_response.status_code == 200
    assert delete_response.json()["is_deleted"] is True
    assert delete_response.json()["deleted_by"] == str(admin.id)

    list_response = client.get("/employees", headers=auth_headers(admin))
    assert list_response.status_code == 200
    assert list_response.json()["items"] == []

    deleted_response = client.get(
        "/employees?include_inactive=true&include_deleted=true",
        headers=auth_headers(admin),
    )
    assert deleted_response.status_code == 200
    assert deleted_response.json()["total"] == 1

    sessions_response = client.get("/attendance/sessions", headers=auth_headers(admin))
    assert sessions_response.status_code == 200
    assert sessions_response.json()["items"][0]["id"] == str(session.id)

    login_response = client.post(
        "/auth/login",
        json={"email": "employee@test.com", "password": "test-password-123"},
    )
    assert login_response.status_code == 401


def test_soft_delete_user_excludes_normal_user_queries(client, db):
    company = make_company(db)
    owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
    target = make_user(db, company=company, email="manager@test.com", role=UserRole.MANAGER)
    db.commit()

    delete_response = client.delete(f"/users/{target.id}", headers=auth_headers(owner))
    assert delete_response.status_code == 200
    assert delete_response.json()["is_deleted"] is True
    assert delete_response.json()["is_active"] is False

    list_response = client.get("/users", headers=auth_headers(owner))
    assert list_response.status_code == 200
    emails = [item["email"] for item in list_response.json()["items"]]
    assert "manager@test.com" not in emails

    deleted_response = client.get(
        "/users?include_inactive=true&include_deleted=true",
        headers=auth_headers(owner),
    )
    assert deleted_response.status_code == 200
    emails = [item["email"] for item in deleted_response.json()["items"]]
    assert "manager@test.com" in emails


def test_deactivate_user_revokes_refresh_tokens(client, db):
    company = make_company(db)
    owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
    target = make_user(db, company=company, email="manager@test.com", role=UserRole.MANAGER)
    db.commit()

    login_response = client.post(
        "/auth/login",
        json={"email": "manager@test.com", "password": "test-password-123"},
    )
    assert login_response.status_code == 200
    token = db.scalar(select(RefreshToken).where(RefreshToken.user_id == target.id))
    assert token is not None
    assert token.revoked_at is None

    deactivate_response = client.patch(f"/users/{target.id}/deactivate", headers=auth_headers(owner))

    assert deactivate_response.status_code == 200
    db.refresh(token)
    assert token.revoked_at is not None


def test_inactive_linked_employee_invalidates_existing_user_session(client, db):
    company = make_company(db)
    employee_user = make_user(db, company=company, email="employee@test.com", role=UserRole.EMPLOYEE)
    employee = make_employee(db, company=company, user=employee_user)
    employee.is_active = False
    db.add(employee)
    db.commit()

    response = client.get("/auth/me", headers=auth_headers(employee_user))
    assert response.status_code == 401
