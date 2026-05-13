"""Attendance location capture and map endpoint tests."""

import pytest

from tests.conftest import auth_headers, make_company, make_employee, make_open_session, make_user
from app.models.enums import UserRole

OFFICE = {"latitude": 41.3851, "longitude": 2.1734, "allowed_radius_meters": 200}


def create_work_location(client, admin, *, name="Oficina", **kwargs):
    payload = {"name": name, **OFFICE, **kwargs}
    resp = client.post("/locations", headers=auth_headers(admin), json=payload)
    assert resp.status_code == 201, resp.json()
    return resp.json()


class TestClockInWithLocation:
    def test_clock_in_saves_coordinates_and_in_range_status(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        db.commit()

        create_work_location(client, admin)

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={
                "employee_id": str(emp.id),
                "method": "web",
                "latitude": 41.3851,
                "longitude": 2.1734,
                "accuracy_meters": 10.0,
                "location_source": "browser",
                "location_permission_status": "granted",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["clock_in_latitude"] == pytest.approx(41.3851, rel=1e-4)
        assert data["clock_in_longitude"] == pytest.approx(2.1734, rel=1e-4)
        assert data["clock_in_accuracy_meters"] == 10.0
        assert data["clock_in_location_status"] == "in_range"
        assert data["clock_in_distance_meters"] == pytest.approx(0.0, abs=1.0)
        assert data["location_source"] == "browser"
        assert data["location_permission_status"] == "granted"

    def test_clock_in_out_of_range_status(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        db.commit()

        create_work_location(client, admin)

        # Clock in from ~504 km away (Madrid instead of Barcelona)
        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={
                "employee_id": str(emp.id),
                "method": "web",
                "latitude": 40.4168,
                "longitude": -3.7038,
                "location_permission_status": "granted",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["clock_in_location_status"] == "out_of_range"

    def test_clock_in_without_coordinates_is_unknown(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        db.commit()

        create_work_location(client, admin)

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={"employee_id": str(emp.id), "method": "web"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["clock_in_latitude"] is None
        assert data["clock_in_location_status"] is None

    def test_clock_in_without_work_location_is_unknown(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        db.commit()

        # No work location configured → status "unknown" (coords present but no reference point)
        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={
                "employee_id": str(emp.id),
                "method": "web",
                "latitude": 41.3851,
                "longitude": 2.1734,
                "location_permission_status": "granted",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["clock_in_location_status"] == "unknown"
        assert data["clock_in_latitude"] == pytest.approx(41.3851, rel=1e-4)

    def test_denied_permission_still_clocks_in(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={
                "employee_id": str(emp.id),
                "method": "web",
                "location_permission_status": "denied",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["location_permission_status"] == "denied"


class TestClockOutWithLocation:
    def test_clock_out_saves_coordinates(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        make_open_session(db, company=company, employee=emp, user=admin)
        db.commit()

        create_work_location(client, admin)

        resp = client.post(
            "/attendance/clock-out",
            headers=auth_headers(admin),
            json={
                "employee_id": str(emp.id),
                "latitude": 41.3851,
                "longitude": 2.1734,
                "location_permission_status": "granted",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["clock_out_latitude"] == pytest.approx(41.3851, rel=1e-4)
        assert data["clock_out_location_status"] == "in_range"


class TestAttendanceLocationEndpoints:
    def test_list_returns_paginated_events(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        make_open_session(db, company=company, employee=emp, user=admin)
        db.commit()

        resp = client.get("/attendance-locations", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    def test_latest_returns_list(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        make_open_session(db, company=company, employee=emp, user=admin)
        db.commit()

        resp = client.get("/attendance-locations/latest", headers=auth_headers(admin))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_summary_returns_counts(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        make_open_session(db, company=company, employee=emp, user=admin)
        db.commit()

        resp = client.get("/attendance-locations/summary", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "in_range" in data
        assert "out_of_range" in data
        assert "unknown" in data

    def test_employee_cannot_access_map_endpoints(self, client, db):
        company = make_company(db)
        emp_user = make_user(db, company=company, role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.get("/attendance-locations", headers=auth_headers(emp_user))
        assert resp.status_code == 403

    def test_cross_tenant_isolation(self, client, db):
        company_a = make_company(db, slug="ca")
        company_b = make_company(db, slug="cb")
        admin_a = make_user(db, company=company_a, email="a@test.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=company_b, email="b@test.com", role=UserRole.ADMIN)
        emp_a = make_employee(db, company=company_a)
        make_open_session(db, company=company_a, employee=emp_a, user=admin_a)
        db.commit()

        # admin_b should see 0 events (company A's sessions are invisible)
        resp = client.get("/attendance-locations", headers=auth_headers(admin_b))
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_unauthenticated_blocked(self, client, db):
        resp = client.get("/attendance-locations")
        assert resp.status_code == 401

    def test_manager_can_access_map(self, client, db):
        company = make_company(db)
        mgr = make_user(db, company=company, role=UserRole.MANAGER)
        db.commit()

        resp = client.get("/attendance-locations", headers=auth_headers(mgr))
        assert resp.status_code == 200
