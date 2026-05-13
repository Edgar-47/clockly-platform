from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.models.attendance_session import AttendanceSession
from app.models.enums import AttendanceIncidentType, AttendanceMethod, AttendanceStatus, UserRole
from tests.conftest import auth_headers, make_company, make_employee, make_open_session, make_user


def amount(value) -> Decimal:
    return Decimal(str(value))


def make_closed_session(
    db,
    *,
    company,
    employee,
    clock_in: datetime,
    hours: int = 8,
    has_incident: bool = False,
):
    session = AttendanceSession(
        company_id=company.id,
        employee_id=employee.id,
        clock_in=clock_in,
        clock_out=clock_in.replace(hour=clock_in.hour + hours),
        duration_seconds=hours * 3600,
        status=AttendanceStatus.CLOSED,
        method=AttendanceMethod.WEB,
        has_incident=has_incident,
        incident_type=AttendanceIncidentType.AUTO_CLOCK_OUT if has_incident else None,
    )
    db.add(session)
    db.flush()
    return session


@pytest.mark.parametrize(
    ("salary_type", "rate", "expected"),
    [
        ("hourly", "10.00", Decimal("80.00")),
        ("daily", "50.00", Decimal("100.00")),
        ("shift", "30.00", Decimal("60.00")),
        ("monthly", "3000.00", Decimal("3000.00")),
        ("weekly", "700.00", Decimal("3000.00")),
    ],
)
def test_salary_calculation_modes(client, db, salary_type, rate, expected):
    company = make_company(db, plan="pro")
    owner = make_user(db, company=company, role=UserRole.OWNER)
    employee = make_employee(db, company=company)
    make_closed_session(db, company=company, employee=employee, clock_in=datetime(2026, 4, 1, 9, 0, tzinfo=UTC), hours=4)
    make_closed_session(db, company=company, employee=employee, clock_in=datetime(2026, 4, 2, 9, 0, tzinfo=UTC), hours=4)
    db.commit()

    profile = client.post(
        "/salary-profiles",
        headers=auth_headers(owner),
        json={
            "employee_id": str(employee.id),
            "salary_type": salary_type,
            "amount": rate,
            "currency": "EUR",
            "effective_from": "2026-04-01",
        },
    )
    calc = client.get(
        f"/salary-calculations?employee_id={employee.id}&from=2026-04-01&to=2026-04-30",
        headers=auth_headers(owner),
    )

    assert profile.status_code == 201
    assert calc.status_code == 200
    assert amount(calc.json()["gross_estimated_amount"]) == expected


def test_salary_calculation_splits_salary_changes_inside_period(client, db):
    company = make_company(db, plan="pro")
    owner = make_user(db, company=company, role=UserRole.OWNER)
    employee = make_employee(db, company=company)
    make_closed_session(db, company=company, employee=employee, clock_in=datetime(2026, 4, 10, 9, 0, tzinfo=UTC), hours=1)
    make_closed_session(db, company=company, employee=employee, clock_in=datetime(2026, 4, 20, 9, 0, tzinfo=UTC), hours=1)
    db.commit()

    first = client.post(
        "/salary-profiles",
        headers=auth_headers(owner),
        json={"employee_id": str(employee.id), "salary_type": "hourly", "amount": "10.00", "effective_from": "2026-04-01"},
    )
    second = client.post(
        "/salary-profiles",
        headers=auth_headers(owner),
        json={"employee_id": str(employee.id), "salary_type": "hourly", "amount": "20.00", "effective_from": "2026-04-16"},
    )
    calc = client.get(
        f"/salary-calculations?employee_id={employee.id}&from=2026-04-01&to=2026-04-30",
        headers=auth_headers(owner),
    )

    assert first.status_code == 201
    assert second.status_code == 201
    data = calc.json()
    assert amount(data["gross_estimated_amount"]) == Decimal("30.00")
    assert len(data["lines"]) == 2


def test_salary_calculation_ignores_open_sessions_and_reports_incidents(client, db):
    company = make_company(db, plan="pro")
    owner = make_user(db, company=company, role=UserRole.OWNER)
    employee = make_employee(db, company=company)
    make_closed_session(
        db,
        company=company,
        employee=employee,
        clock_in=datetime(2026, 4, 5, 9, 0, tzinfo=UTC),
        hours=2,
        has_incident=True,
    )
    open_session = make_open_session(db, company=company, employee=employee, user=owner)
    open_session.clock_in = datetime(2026, 4, 6, 9, 0, tzinfo=UTC)
    db.commit()

    client.post(
        "/salary-profiles",
        headers=auth_headers(owner),
        json={"employee_id": str(employee.id), "salary_type": "hourly", "amount": "10.00", "effective_from": "2026-04-01"},
    )
    calc = client.get(
        f"/salary-calculations?employee_id={employee.id}&from=2026-04-01&to=2026-04-30",
        headers=auth_headers(owner),
    )

    data = calc.json()
    assert amount(data["gross_estimated_amount"]) == Decimal("20.00")
    assert data["open_sessions_ignored"] == 1
    assert data["incident_count"] == 1


def test_salary_does_not_mix_tenants(client, db):
    co_a = make_company(db, slug="salary-a", plan="pro")
    co_b = make_company(db, slug="salary-b", plan="pro")
    owner_a = make_user(db, company=co_a, role=UserRole.OWNER, email="a@test.com")
    employee_b = make_employee(db, company=co_b)
    db.commit()

    response = client.get(
        f"/salary-calculations?employee_id={employee_b.id}&from=2026-04-01&to=2026-04-30",
        headers=auth_headers(owner_a),
    )

    assert response.status_code == 404


def test_salary_permissions_by_role(client, db):
    company = make_company(db, plan="pro")
    hr = make_user(db, company=company, role=UserRole.HR_MANAGER, email="hr@test.com")
    manager = make_user(db, company=company, role=UserRole.MANAGER, email="manager@test.com")
    employee = make_employee(db, company=company)
    db.commit()

    hr_response = client.post(
        "/salary-profiles",
        headers=auth_headers(hr),
        json={"employee_id": str(employee.id), "salary_type": "daily", "amount": "80.00", "effective_from": "2026-04-01"},
    )
    manager_response = client.get("/salary-profiles", headers=auth_headers(manager))

    assert hr_response.status_code == 201
    assert manager_response.status_code == 403
