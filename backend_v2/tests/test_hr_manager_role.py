from datetime import UTC, datetime, timedelta

from app.models.enums import AttendanceMethod, AttendanceStatus, UserRole
from app.models.attendance_session import AttendanceSession
from tests.conftest import auth_headers, make_company, make_employee, make_user


def test_hr_manager_can_manage_people_and_read_metrics(client, db):
    company = make_company(db, plan="pro")
    hr = make_user(db, company=company, email="hr@test.com", role=UserRole.HR_MANAGER)
    db.commit()

    list_response = client.get("/employees", headers=auth_headers(hr))
    create_response = client.post(
        "/employees",
        headers=auth_headers(hr),
        json={"first_name": "New", "last_name": "Hire", "email": "new@test.com"},
    )
    metrics_response = client.get("/metrics/overview", headers=auth_headers(hr))

    assert list_response.status_code == 200
    assert create_response.status_code == 201
    assert metrics_response.status_code == 200


def test_hr_manager_can_create_employee_user_but_not_manager_user(client, db):
    company = make_company(db)
    hr = make_user(db, company=company, email="hr@test.com", role=UserRole.HR_MANAGER)
    db.commit()

    employee_user = client.post(
        "/users",
        headers=auth_headers(hr),
        json={
            "email": "worker@test.com",
            "full_name": "Worker User",
            "password": "password-123",
            "role": "employee",
        },
    )
    manager_user = client.post(
        "/users",
        headers=auth_headers(hr),
        json={
            "email": "manager@test.com",
            "full_name": "Manager User",
            "password": "password-123",
            "role": "manager",
        },
    )

    assert employee_user.status_code == 201
    assert manager_user.status_code == 403


def test_hr_manager_can_read_and_update_attendance_but_cannot_change_settings_or_billing(client, db):
    company = make_company(db, plan="pro")
    hr = make_user(db, company=company, email="hr@test.com", role=UserRole.HR_MANAGER)
    employee = make_employee(db, company=company)
    session = AttendanceSession(
        company_id=company.id,
        employee_id=employee.id,
        clock_in=datetime.now(UTC) - timedelta(hours=8),
        clock_out=datetime.now(UTC),
        duration_seconds=28800,
        status=AttendanceStatus.CLOSED,
        method=AttendanceMethod.WEB,
    )
    db.add(session)
    db.commit()

    sessions_response = client.get("/attendance/sessions", headers=auth_headers(hr))
    update_response = client.patch(
        f"/attendance/sessions/{session.id}",
        headers=auth_headers(hr),
        json={
            "clock_in": "2026-04-28T09:00:00",
            "clock_out": "2026-04-28T17:00:00",
            "notes": "Revision RRHH",
        },
    )
    export_response = client.get("/exports/attendance", headers=auth_headers(hr))
    settings_response = client.put(
        "/settings/auto-clock-out",
        headers=auth_headers(hr),
        json={
            "auto_clock_out_enabled": True,
            "auto_clock_out_time": "23:30",
            "auto_clock_out_timezone": "UTC",
            "auto_clock_out_grace_minutes": 0,
        },
    )
    billing_response = client.post("/billing/portal", headers=auth_headers(hr), json={"return_url": "http://test"})

    assert sessions_response.status_code == 200
    assert update_response.status_code == 200
    assert export_response.status_code == 200
    assert settings_response.status_code == 403
    assert billing_response.status_code == 403


def test_hr_manager_cannot_modify_owner_role(client, db):
    company = make_company(db)
    hr = make_user(db, company=company, email="hr@test.com", role=UserRole.HR_MANAGER)
    owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
    db.commit()

    response = client.patch(
        f"/users/{owner.id}/role",
        headers=auth_headers(hr),
        json={"role": "employee"},
    )

    assert response.status_code == 403
