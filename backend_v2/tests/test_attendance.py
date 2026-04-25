"""Attendance clock-in / clock-out tests.

Covers: normal flow, double clock-in, inactive employee,
kiosk PIN validation, employee self-scope enforcement.
"""
import pytest

from tests.conftest import auth_headers, make_company, make_employee, make_open_session, make_user
from app.models.enums import UserRole


class TestClockIn:
    def test_admin_clocks_in_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company, first_name="Ana", last_name="Garcia")
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={"employee_id": str(emp.id), "method": "web"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["employee_id"] == str(emp.id)
        assert data["status"] == "open"
        assert data["clock_out"] is None

    def test_employee_clocks_in_self(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        make_employee(db, company=company, user=user)
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(user),
            json={"method": "web"},
        )
        assert resp.status_code == 201

    def test_employee_cannot_clock_in_other_employee(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        make_employee(db, company=company, user=user)
        other_emp = make_employee(db, company=company, first_name="Other", last_name="Person")
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(user),
            json={"employee_id": str(other_emp.id), "method": "web"},
        )
        # Route strips employee_id for employees; tries to clock in self
        assert resp.status_code == 201
        assert resp.json()["employee_id"] != str(other_emp.id)

    def test_double_clock_in_rejected(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        make_open_session(db, company=company, employee=emp, user=admin)
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={"employee_id": str(emp.id)},
        )
        assert resp.status_code == 409

    def test_clock_in_inactive_employee_rejected(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company, is_active=False)
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={"employee_id": str(emp.id)},
        )
        assert resp.status_code == 404

    def test_kiosk_clock_in_with_valid_pin(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company, pin="1234")
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={"employee_id": str(emp.id), "method": "kiosk", "pin": "1234"},
        )
        assert resp.status_code == 201

    def test_kiosk_clock_in_with_invalid_pin(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company, pin="1234")
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={"employee_id": str(emp.id), "method": "kiosk", "pin": "9999"},
        )
        assert resp.status_code == 403

    def test_kiosk_clock_in_without_pin_rejected(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company, pin="1234")
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={"employee_id": str(emp.id), "method": "kiosk"},
        )
        assert resp.status_code == 403


class TestClockOut:
    def test_admin_clocks_out_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        session = make_open_session(db, company=company, employee=emp, user=admin)
        db.commit()

        resp = client.post(
            "/attendance/clock-out",
            headers=auth_headers(admin),
            json={"employee_id": str(emp.id)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "closed"
        assert data["clock_out"] is not None
        assert data["duration_seconds"] >= 0

    def test_clock_out_without_open_session_rejected(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        db.commit()

        resp = client.post(
            "/attendance/clock-out",
            headers=auth_headers(admin),
            json={"employee_id": str(emp.id)},
        )
        assert resp.status_code == 409

    def test_clock_out_by_session_id(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        session = make_open_session(db, company=company, employee=emp, user=admin)
        db.commit()

        resp = client.post(
            "/attendance/clock-out",
            headers=auth_headers(admin),
            json={"session_id": str(session.id)},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "closed"


class TestAttendancePagination:
    def test_sessions_list_has_pagination_fields(self, client, db):
        company = make_company(db, plan="pro")
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/attendance/sessions", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert "items" in data

    def test_sessions_list_respects_limit(self, client, db):
        company = make_company(db, plan="pro")
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        for i in range(5):
            emp = make_employee(db, company=company, first_name=f"Emp{i}")
            make_open_session(db, company=company, employee=emp, user=admin)
        db.commit()

        resp = client.get("/attendance/sessions?limit=2", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
