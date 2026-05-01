"""Attendance clock-in / clock-out tests.

Covers: normal flow, double clock-in, inactive employee,
kiosk PIN validation, employee self-scope enforcement.
"""

from datetime import UTC, datetime, timedelta

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

    def test_employee_cannot_use_kiosk_method_without_admin_session(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        make_employee(db, company=company, user=user, pin="1234")
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(user),
            json={"method": "kiosk", "pin": "1234"},
        )
        assert resp.status_code == 403

    def test_free_plan_rejects_geolocation_payload(self, client, db):
        company = make_company(db, plan="free")
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        make_employee(db, company=company, user=user)
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(user),
            json={
                "method": "web",
                "latitude": 40.4168,
                "longitude": -3.7038,
                "accuracy_meters": 25,
                "location_source": "browser",
                "location_permission_status": "granted",
            },
        )
        assert resp.status_code == 403


class TestClockOut:
    def test_admin_clocks_out_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        make_open_session(db, company=company, employee=emp, user=admin)
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


class TestAttendanceAdminCorrections:
    def test_admin_edits_session_and_marks_corrected(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        session = make_open_session(db, company=company, employee=emp, user=admin)
        db.commit()

        resp = client.patch(
            f"/attendance/sessions/{session.id}",
            headers=auth_headers(admin),
            json={
                "clock_in": "2026-04-28T09:00:00",
                "clock_out": "2026-04-28T17:30:00",
                "notes": "Correccion administrativa",
                "mark_corrected": True,
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "closed"
        assert data["duration_seconds"] == 30600
        assert data["is_corrected"] is True
        assert data["notes"] == "Correccion administrativa"

    def test_admin_auto_closes_old_open_sessions(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        session = make_open_session(db, company=company, employee=emp, user=admin)
        session.clock_in = datetime.now(UTC) - timedelta(hours=20)
        db.commit()

        resp = client.post(
            "/attendance/sessions/bulk/auto-close",
            headers=auth_headers(admin),
            json={"older_than_hours": 16, "notes": "Auto cierre"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["closed_count"] == 1
        assert data["items"][0]["status"] == "closed"
        assert data["items"][0]["auto_closed"] is True
