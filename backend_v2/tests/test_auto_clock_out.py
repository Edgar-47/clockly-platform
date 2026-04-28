from datetime import UTC, datetime, time

from app.models.attendance_incident import AttendanceIncident
from app.models.company_settings import CompanySettings
from app.models.enums import AttendanceIncidentType, AttendanceStatus, ClockOutSource, UserRole
from app.services.auto_clock_out_service import AutoClockOutService
from tests.conftest import auth_headers, make_company, make_employee, make_open_session, make_user


def as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def test_auto_clock_out_noop_when_disabled(db):
    company = make_company(db)
    owner = make_user(db, company=company, role=UserRole.OWNER)
    employee = make_employee(db, company=company)
    session = make_open_session(db, company=company, employee=employee, user=owner)
    session.clock_in = datetime(2026, 4, 28, 8, 0, tzinfo=UTC)
    db.add(CompanySettings(company_id=company.id, auto_clock_out_enabled=False, auto_clock_out_time=time(10, 0)))
    db.commit()

    result = AutoClockOutService(db, company_id=company.id).run(
        actor=owner,
        now=datetime(2026, 4, 28, 12, 0, tzinfo=UTC),
    )

    db.refresh(session)
    assert result.closed_count == 0
    assert session.status == AttendanceStatus.OPEN


def test_auto_clock_out_noop_without_configured_time(db):
    company = make_company(db)
    owner = make_user(db, company=company, role=UserRole.OWNER)
    employee = make_employee(db, company=company)
    session = make_open_session(db, company=company, employee=employee, user=owner)
    session.clock_in = datetime(2026, 4, 28, 8, 0, tzinfo=UTC)
    db.add(CompanySettings(company_id=company.id, auto_clock_out_enabled=True, auto_clock_out_time=None))
    db.commit()

    result = AutoClockOutService(db, company_id=company.id).run(
        actor=owner,
        now=datetime(2026, 4, 28, 12, 0, tzinfo=UTC),
    )

    assert result.closed_count == 0


def test_auto_clock_out_closes_open_session_and_creates_single_incident(db):
    company = make_company(db)
    owner = make_user(db, company=company, role=UserRole.OWNER)
    employee = make_employee(db, company=company)
    session = make_open_session(db, company=company, employee=employee, user=owner)
    session.clock_in = datetime(2026, 4, 28, 8, 0, tzinfo=UTC)
    db.add(
        CompanySettings(
            company_id=company.id,
            auto_clock_out_enabled=True,
            auto_clock_out_time=time(10, 0),
            auto_clock_out_timezone="UTC",
            auto_clock_out_updated_by_user_id=owner.id,
        )
    )
    db.commit()

    first = AutoClockOutService(db, company_id=company.id).run(
        actor=owner,
        now=datetime(2026, 4, 28, 12, 0, tzinfo=UTC),
    )
    second = AutoClockOutService(db, company_id=company.id).run(
        actor=owner,
        now=datetime(2026, 4, 28, 12, 5, tzinfo=UTC),
    )

    db.refresh(session)
    incidents = db.query(AttendanceIncident).filter(AttendanceIncident.attendance_session_id == session.id).all()
    assert first.closed_count == 1
    assert second.closed_count == 0
    assert session.status == AttendanceStatus.CLOSED
    assert as_utc(session.clock_out) == datetime(2026, 4, 28, 10, 0, tzinfo=UTC)
    assert session.clock_out_source == ClockOutSource.AUTO
    assert session.has_incident is True
    assert session.incident_type == AttendanceIncidentType.AUTO_CLOCK_OUT
    assert len(incidents) == 1
    assert incidents[0].type == AttendanceIncidentType.AUTO_CLOCK_OUT


def test_auto_clock_out_respects_company_scope(db):
    co_a = make_company(db, slug="auto-a")
    co_b = make_company(db, slug="auto-b")
    owner_a = make_user(db, company=co_a, role=UserRole.OWNER, email="a@test.com")
    owner_b = make_user(db, company=co_b, role=UserRole.OWNER, email="b@test.com")
    emp_a = make_employee(db, company=co_a)
    emp_b = make_employee(db, company=co_b)
    session_a = make_open_session(db, company=co_a, employee=emp_a, user=owner_a)
    session_b = make_open_session(db, company=co_b, employee=emp_b, user=owner_b)
    session_a.clock_in = datetime(2026, 4, 28, 8, 0, tzinfo=UTC)
    session_b.clock_in = datetime(2026, 4, 28, 8, 0, tzinfo=UTC)
    db.add(CompanySettings(company_id=co_a.id, auto_clock_out_enabled=True, auto_clock_out_time=time(10, 0)))
    db.commit()

    AutoClockOutService(db, company_id=co_a.id).run(
        actor=owner_a,
        now=datetime(2026, 4, 28, 12, 0, tzinfo=UTC),
    )

    db.refresh(session_a)
    db.refresh(session_b)
    assert session_a.status == AttendanceStatus.CLOSED
    assert session_b.status == AttendanceStatus.OPEN


def test_auto_clock_out_respects_configured_timezone(db):
    company = make_company(db)
    company.timezone = "Europe/Madrid"
    owner = make_user(db, company=company, role=UserRole.OWNER)
    employee = make_employee(db, company=company)
    session = make_open_session(db, company=company, employee=employee, user=owner)
    session.clock_in = datetime(2026, 4, 28, 7, 0, tzinfo=UTC)
    db.add(
        CompanySettings(
            company_id=company.id,
            auto_clock_out_enabled=True,
            auto_clock_out_time=time(23, 30),
            auto_clock_out_timezone="Europe/Madrid",
        )
    )
    db.commit()

    AutoClockOutService(db, company_id=company.id).run(
        actor=owner,
        now=datetime(2026, 4, 28, 22, 0, tzinfo=UTC),
    )

    db.refresh(session)
    assert as_utc(session.clock_out) == datetime(2026, 4, 28, 21, 30, tzinfo=UTC)


def test_hr_manager_cannot_update_auto_clock_out_settings(client, db):
    company = make_company(db)
    hr = make_user(db, company=company, role=UserRole.HR_MANAGER, email="hr@test.com")
    db.commit()

    response = client.put(
        "/settings/auto-clock-out",
        headers=auth_headers(hr),
        json={
            "auto_clock_out_enabled": True,
            "auto_clock_out_time": "23:30",
            "auto_clock_out_timezone": "UTC",
            "auto_clock_out_grace_minutes": 0,
        },
    )

    assert response.status_code == 403
