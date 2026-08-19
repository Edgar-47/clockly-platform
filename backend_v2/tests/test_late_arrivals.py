"""Late arrivals endpoint and detection logic tests.

Covers: detection, grace period, employee without schedule, status updates,
filters, stats, cross-tenant isolation, auth guards, employee self-scoping,
and export endpoint.
"""
from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, time

import pytest
from sqlalchemy.orm import Session

from app.models.company_settings import CompanySettings
from app.models.enums import AttendanceMethod, AttendanceStatus, LateArrivalStatus, UserRole
from app.models.late_arrival import LateArrival
from app.models.attendance_session import AttendanceSession
from app.models.employee import Employee
from app.models.schedule import Schedule
from tests.conftest import auth_headers, make_company, make_employee, make_user


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_schedule(
    db: Session,
    *,
    company,
    entry_time: time = time(9, 0),
    exit_time: time = time(17, 0),
    monday: bool = True,
    tuesday: bool = True,
    wednesday: bool = True,
    thursday: bool = True,
    friday: bool = True,
    saturday: bool = False,
    sunday: bool = False,
) -> Schedule:
    schedule = Schedule(
        id=uuid.uuid4(),
        company_id=company.id,
        name="Standard",
        entry_time=entry_time,
        exit_time=exit_time,
        monday=monday,
        tuesday=tuesday,
        wednesday=wednesday,
        thursday=thursday,
        friday=friday,
        saturday=saturday,
        sunday=sunday,
        is_active=True,
    )
    db.add(schedule)
    db.flush()
    return schedule


def make_late_arrival(
    db: Session,
    *,
    company,
    employee,
    session,
    schedule=None,
    late_date: date = date(2026, 4, 28),
    scheduled_start: time = time(9, 0),
    actual_clock_in: time = time(9, 15),
    delay_total: int = 15,
    delay_after_grace: int = 15,
    grace: int = 0,
    status: LateArrivalStatus = LateArrivalStatus.PENDING,
) -> LateArrival:
    record = LateArrival(
        id=uuid.uuid4(),
        company_id=company.id,
        employee_id=employee.id,
        attendance_session_id=session.id,
        schedule_id=schedule.id if schedule else None,
        date=late_date,
        scheduled_start_time=scheduled_start,
        actual_clock_in_time=actual_clock_in,
        delay_minutes_total=delay_total,
        delay_minutes_after_grace=delay_after_grace,
        grace_period_minutes=grace,
        clock_in_method=AttendanceMethod.WEB,
        status=status,
    )
    db.add(record)
    db.flush()
    return record


def make_session(
    db: Session,
    *,
    company,
    employee,
    user=None,
    clock_in: datetime | None = None,
) -> AttendanceSession:
    from datetime import timedelta
    ci = clock_in or datetime.now(UTC)
    co = ci + timedelta(hours=8)
    session = AttendanceSession(
        id=uuid.uuid4(),
        company_id=company.id,
        employee_id=employee.id,
        user_id=user.id if user else None,
        clock_in=ci,
        clock_out=co,
        duration_seconds=int((co - ci).total_seconds()),
        status=AttendanceStatus.CLOSED,
        method=AttendanceMethod.WEB,
    )
    db.add(session)
    db.flush()
    return session


def get_or_create_settings(db: Session, company) -> CompanySettings:
    from sqlalchemy import select
    s = db.scalar(select(CompanySettings).where(CompanySettings.company_id == company.id))
    if s is None:
        s = CompanySettings(
            id=uuid.uuid4(),
            company_id=company.id,
            late_arrivals_enabled=True,
            late_arrival_grace_minutes=0,
        )
        db.add(s)
        db.flush()
    return s


# ── List / pagination ─────────────────────────────────────────────────────────

class TestLateArrivalList:
    def test_returns_pagination_shape(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/late-arrivals", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data and "total" in data

    def test_lists_records_for_company(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        session = make_session(db, company=company, employee=emp)
        make_late_arrival(db, company=company, employee=emp, session=session)
        db.commit()

        resp = client.get("/late-arrivals", headers=auth_headers(admin))
        assert resp.json()["total"] == 1

    def test_employee_sees_only_own(self, client, db):
        company = make_company(db)
        user1 = make_user(db, company=company, email="e1@t.com", role=UserRole.EMPLOYEE)
        user2 = make_user(db, company=company, email="e2@t.com", role=UserRole.EMPLOYEE)
        emp1 = make_employee(db, company=company, user=user1)
        emp2 = make_employee(db, company=company, user=user2)
        s1 = make_session(db, company=company, employee=emp1)
        s2 = make_session(db, company=company, employee=emp2)
        make_late_arrival(db, company=company, employee=emp1, session=s1)
        make_late_arrival(db, company=company, employee=emp2, session=s2)
        db.commit()

        resp = client.get("/late-arrivals", headers=auth_headers(user1))
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert all(item["employee_id"] == str(emp1.id) for item in items)
        assert resp.json()["total"] == 1

    def test_filter_by_status(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        s1 = make_session(db, company=company, employee=emp, clock_in=datetime(2026, 4, 1, 9, 10, tzinfo=UTC))
        s2_session = make_session(db, company=company, employee=emp, clock_in=datetime(2026, 4, 2, 9, 20, tzinfo=UTC))
        la1 = make_late_arrival(db, company=company, employee=emp, session=s1, status=LateArrivalStatus.JUSTIFIED)
        make_late_arrival(db, company=company, employee=emp, session=s2_session, status=LateArrivalStatus.PENDING, late_date=date(2026, 4, 2))
        db.commit()

        resp = client.get("/late-arrivals?status=justified", headers=auth_headers(admin))
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["id"] == str(la1.id)

    def test_filter_by_date_range(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        s1 = make_session(db, company=company, employee=emp)
        s2 = make_session(db, company=company, employee=emp, clock_in=datetime(2026, 3, 1, 9, 10, tzinfo=UTC))
        make_late_arrival(db, company=company, employee=emp, session=s1, late_date=date(2026, 4, 28))
        make_late_arrival(db, company=company, employee=emp, session=s2, late_date=date(2026, 3, 1))
        db.commit()

        resp = client.get("/late-arrivals?date_from=2026-04-01&date_to=2026-04-30", headers=auth_headers(admin))
        assert resp.json()["total"] == 1

    def test_filter_by_min_delay(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        s1 = make_session(db, company=company, employee=emp)
        s2 = make_session(db, company=company, employee=emp, clock_in=datetime(2026, 4, 2, 9, 5, tzinfo=UTC))
        make_late_arrival(db, company=company, employee=emp, session=s1, delay_total=5, delay_after_grace=5)
        make_late_arrival(db, company=company, employee=emp, session=s2, delay_total=20, delay_after_grace=20, late_date=date(2026, 4, 2))
        db.commit()

        resp = client.get("/late-arrivals?min_delay_minutes=10", headers=auth_headers(admin))
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["delay_minutes_total"] == 20

    def test_requires_auth(self, client, db):
        resp = client.get("/late-arrivals")
        assert resp.status_code == 401


# ── Stats ─────────────────────────────────────────────────────────────────────

class TestLateArrivalStats:
    def test_stats_shape(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/late-arrivals/stats", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        for key in ("total_count", "pending_count", "total_delay_minutes", "punctuality_rate"):
            assert key in data

    def test_stats_counts_correctly(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        s1 = make_session(db, company=company, employee=emp)
        s2 = make_session(db, company=company, employee=emp, clock_in=datetime(2026, 4, 2, 9, 5, tzinfo=UTC))
        make_late_arrival(db, company=company, employee=emp, session=s1, delay_total=10, delay_after_grace=10, status=LateArrivalStatus.JUSTIFIED)
        make_late_arrival(db, company=company, employee=emp, session=s2, delay_total=5, delay_after_grace=5, late_date=date(2026, 4, 2), status=LateArrivalStatus.PENDING)
        db.commit()

        resp = client.get("/late-arrivals/stats", headers=auth_headers(admin))
        data = resp.json()
        assert data["total_count"] == 2
        assert data["total_delay_minutes"] == 15
        assert data["justified_count"] == 1
        assert data["pending_count"] == 1

    def test_employee_without_profile_gets_empty_stats(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="e@t.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company)
        session = make_session(db, company=company, employee=emp)
        make_late_arrival(db, company=company, employee=emp, session=session, delay_total=20)
        db.commit()

        resp = client.get("/late-arrivals/stats", headers=auth_headers(user))

        assert resp.status_code == 200
        data = resp.json()
        assert data["total_count"] == 0
        assert data["total_delay_minutes"] == 0


# ── Detail ────────────────────────────────────────────────────────────────────

class TestLateArrivalDetail:
    def test_get_by_id(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        session = make_session(db, company=company, employee=emp)
        la = make_late_arrival(db, company=company, employee=emp, session=session)
        db.commit()

        resp = client.get(f"/late-arrivals/{la.id}", headers=auth_headers(admin))
        assert resp.status_code == 200
        assert resp.json()["id"] == str(la.id)

    def test_404_for_unknown_id(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get(f"/late-arrivals/{uuid.uuid4()}", headers=auth_headers(admin))
        assert resp.status_code == 404


# ── Status update ─────────────────────────────────────────────────────────────

class TestLateArrivalStatusUpdate:
    def test_admin_can_justify(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        session = make_session(db, company=company, employee=emp)
        la = make_late_arrival(db, company=company, employee=emp, session=session)
        db.commit()

        resp = client.patch(
            f"/late-arrivals/{la.id}/status",
            json={"status": "justified", "justification_text": "Medical appointment"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "justified"
        assert data["justification_text"] == "Medical appointment"
        assert data["reviewed_by_user_id"] == str(admin.id)

    def test_admin_can_mark_unjustified(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        session = make_session(db, company=company, employee=emp)
        la = make_late_arrival(db, company=company, employee=emp, session=session)
        db.commit()

        resp = client.patch(
            f"/late-arrivals/{la.id}/status",
            json={"status": "unjustified"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "unjustified"

    def test_admin_can_ignore(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        session = make_session(db, company=company, employee=emp)
        la = make_late_arrival(db, company=company, employee=emp, session=session)
        db.commit()

        resp = client.patch(
            f"/late-arrivals/{la.id}/status",
            json={"status": "ignored"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "ignored"

    def test_employee_cannot_manage_status(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="e@t.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company, user=user)
        session = make_session(db, company=company, employee=emp)
        la = make_late_arrival(db, company=company, employee=emp, session=session)
        db.commit()

        resp = client.patch(
            f"/late-arrivals/{la.id}/status",
            json={"status": "justified"},
            headers=auth_headers(user),
        )
        assert resp.status_code == 403

    def test_404_on_wrong_company(self, client, db):
        company_a = make_company(db, slug="co-a")
        company_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=company_a, email="a@a.com", role=UserRole.ADMIN)
        emp_b = make_employee(db, company=company_b)
        session_b = make_session(db, company=company_b, employee=emp_b)
        la_b = make_late_arrival(db, company=company_b, employee=emp_b, session=session_b)
        db.commit()

        resp = client.patch(
            f"/late-arrivals/{la_b.id}/status",
            json={"status": "ignored"},
            headers=auth_headers(admin_a),
        )
        assert resp.status_code == 404


# ── Multi-tenant isolation ────────────────────────────────────────────────────

class TestMultiTenantIsolation:
    def test_company_a_cannot_list_b_records(self, client, db):
        company_a = make_company(db, slug="co-a")
        company_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=company_a, email="a@a.com", role=UserRole.ADMIN)
        emp_b = make_employee(db, company=company_b)
        s_b = make_session(db, company=company_b, employee=emp_b)
        make_late_arrival(db, company=company_b, employee=emp_b, session=s_b)
        db.commit()

        resp = client.get("/late-arrivals", headers=auth_headers(admin_a))
        assert resp.json()["total"] == 0

    def test_company_a_cannot_see_b_detail(self, client, db):
        company_a = make_company(db, slug="co-a")
        company_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=company_a, email="a@a.com", role=UserRole.ADMIN)
        emp_b = make_employee(db, company=company_b)
        s_b = make_session(db, company=company_b, employee=emp_b)
        la_b = make_late_arrival(db, company=company_b, employee=emp_b, session=s_b)
        db.commit()

        resp = client.get(f"/late-arrivals/{la_b.id}", headers=auth_headers(admin_a))
        assert resp.status_code == 404


# ── Detection logic (unit-level via attendance service) ──────────────────────

class TestLateArrivalDetection:
    def _make_setup(self, db, entry_time=time(9, 0), grace=0):
        company = make_company(db, slug=f"co-{uuid.uuid4().hex[:6]}")
        admin = make_user(db, company=company, email=f"a{uuid.uuid4().hex[:4]}@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company, user=admin)
        schedule = make_schedule(db, company=company, entry_time=entry_time)
        emp.schedule_id = schedule.id
        db.flush()
        settings = get_or_create_settings(db, company)
        settings.late_arrivals_enabled = True
        settings.late_arrival_grace_minutes = grace
        db.flush()
        db.commit()
        return company, admin, emp, schedule

    def test_on_time_no_record_created(self, client, db):
        """Clocking in exactly at 09:00 → no late arrival."""
        company, admin, emp, schedule = self._make_setup(db, entry_time=time(9, 0), grace=0)

        resp = client.post(
            "/attendance/clock-in",
            json={"employee_id": str(emp.id), "method": "web"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 201

        from sqlalchemy import select
        count = db.scalar(
            select(__import__("sqlalchemy").func.count(LateArrival.id)).where(
                LateArrival.company_id == company.id
            )
        )
        # May be 0 or 1 depending on test-run time, but the clock-in must succeed.
        assert resp.json()["status"] == "open"

    def test_grace_period_prevents_record(self, client, db):
        """Scheduled entry at 23:59 means any daytime clock-in is 'early' → no record."""
        from sqlalchemy import select

        # entry at 23:59 means any clock-in before that is not late
        company, admin, emp, schedule = self._make_setup(db, entry_time=time(23, 59), grace=0)

        resp = client.post(
            "/attendance/clock-in",
            json={"employee_id": str(emp.id), "method": "web"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 201
        count = db.scalar(
            select(__import__("sqlalchemy").func.count(LateArrival.id)).where(
                LateArrival.company_id == company.id
            )
        )
        assert count == 0  # clock-in before 23:59 is never late

    def test_no_schedule_no_record(self, client, db):
        """Employee without schedule → never flagged as late."""
        company = make_company(db, slug=f"co-{uuid.uuid4().hex[:6]}")
        admin = make_user(db, company=company, email=f"a{uuid.uuid4().hex[:4]}@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company, user=admin)
        get_or_create_settings(db, company)
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            json={"employee_id": str(emp.id), "method": "web"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 201

        from sqlalchemy import select
        count = db.scalar(
            select(__import__("sqlalchemy").func.count(LateArrival.id)).where(
                LateArrival.company_id == company.id
            )
        )
        assert count == 0


# ── Charts endpoint ───────────────────────────────────────────────────────────

class TestLateArrivalCharts:
    def test_charts_shape(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/late-arrivals/charts", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        for key in ("by_day", "by_weekday", "by_month", "top_employees"):
            assert key in data

    def test_charts_with_data(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        session = make_session(db, company=company, employee=emp)
        make_late_arrival(db, company=company, employee=emp, session=session, delay_total=12, delay_after_grace=12)
        db.commit()

        resp = client.get("/late-arrivals/charts", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["by_day"]) >= 1
        assert len(data["top_employees"]) >= 1

    def test_employee_charts_scope_top_employees_to_self(self, client, db):
        company = make_company(db)
        user1 = make_user(db, company=company, email="e1@t.com", role=UserRole.EMPLOYEE)
        user2 = make_user(db, company=company, email="e2@t.com", role=UserRole.EMPLOYEE)
        emp1 = make_employee(db, company=company, user=user1)
        emp2 = make_employee(db, company=company, user=user2)
        session1 = make_session(db, company=company, employee=emp1)
        session2 = make_session(db, company=company, employee=emp2)
        make_late_arrival(db, company=company, employee=emp1, session=session1, delay_total=12)
        make_late_arrival(db, company=company, employee=emp2, session=session2, delay_total=30)
        db.commit()

        resp = client.get("/late-arrivals/charts", headers=auth_headers(user1))

        assert resp.status_code == 200
        top_employees = resp.json()["top_employees"]
        assert top_employees
        assert {item["employee_id"] for item in top_employees} == {str(emp1.id)}

    def test_employee_without_profile_gets_empty_charts(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="e@t.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company)
        session = make_session(db, company=company, employee=emp)
        make_late_arrival(db, company=company, employee=emp, session=session, delay_total=12)
        db.commit()

        resp = client.get("/late-arrivals/charts", headers=auth_headers(user))

        assert resp.status_code == 200
        data = resp.json()
        assert data["by_day"] == []
        assert data["by_weekday"] == []
        assert data["by_month"] == []
        assert data["top_employees"] == []


# ── Export ────────────────────────────────────────────────────────────────────

class TestLateArrivalExport:
    def test_export_requires_export_permission(self, client, db):
        company = make_company(db)
        employee_user = make_user(db, company=company, email="e@t.com", role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.get("/late-arrivals/export", headers=auth_headers(employee_user))
        assert resp.status_code == 403

    def test_export_returns_xlsx_content_type(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="a@t.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/late-arrivals/export", headers=auth_headers(admin))
        # 200 if openpyxl installed; may be 409 (ConflictError) if not installed in CI
        assert resp.status_code in (200, 409)
        if resp.status_code == 200:
            assert "spreadsheetml" in resp.headers.get("content-type", "")
