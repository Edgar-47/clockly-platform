"""Pytest fixtures for ClockLy backend tests.

Uses an in-memory SQLite database with StaticPool so all connections share
the same in-memory database (avoiding "no such table" across connections).

Each test gets a fresh database via a per-test engine.
"""
from __future__ import annotations

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password, hash_pin
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.attendance_session import AttendanceSession
from app.models.audit_log import AuditLog  # noqa: F401 — ensures table is registered
from app.models.company import Company
from app.models.company_location import CompanyLocation  # noqa: F401
from app.models.company_usage_log import CompanyUsageLog  # noqa: F401
from app.models.employee import Employee
from app.models.enums import AttendanceMethod, AttendanceStatus, UserRole
from app.models.refresh_token import RefreshToken  # noqa: F401
from app.models.schedule import Schedule  # noqa: F401
from app.models.ticket import Ticket  # noqa: F401
from app.models.user import User
from app.models.user_invitation import UserInvitation  # noqa: F401
from app.core.rate_limit import kiosk_limiter, login_limiter, password_reset_limiter, refresh_limiter, registration_limiter
from app.services.plans import apply_plan_to_company


# ─── Database fixture ─────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_rate_limiters():
    """Clear in-memory rate limiter state before each test to prevent interference."""
    login_limiter._buckets.clear()
    registration_limiter._buckets.clear()
    password_reset_limiter._buckets.clear()
    refresh_limiter._buckets.clear()
    kiosk_limiter._buckets.clear()
    yield

@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Per-test SQLite in-memory database.

    Uses StaticPool so all connections (including those created inside
    FastAPI request handlers) share the same in-memory database.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    SessionFactory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ─── Factories ────────────────────────────────────────────────────────────────

def make_company(
    db: Session,
    *,
    slug: str = "test-co",
    plan: str = "pro",
    name: str = "Test Company",
) -> Company:
    company = apply_plan_to_company(
        Company(
            id=uuid.uuid4(),
            name=name,
            slug=slug,
            timezone="UTC",
        ),
        plan,
    )
    db.add(company)
    db.flush()
    return company


def make_user(
    db: Session,
    *,
    company: Company,
    email: str = "user@test.com",
    role: UserRole = UserRole.EMPLOYEE,
    password: str = "test-password-123",
    is_active: bool = True,
) -> User:
    user = User(
        id=uuid.uuid4(),
        company_id=company.id,
        email=email,
        full_name="Test User",
        password_hash=hash_password(password),
        role=role,
        is_active=is_active,
    )
    db.add(user)
    db.flush()
    return user


def make_employee(
    db: Session,
    *,
    company: Company,
    user: User | None = None,
    first_name: str = "Test",
    last_name: str = "Employee",
    pin: str | None = None,
    is_active: bool = True,
) -> Employee:
    employee = Employee(
        id=uuid.uuid4(),
        company_id=company.id,
        user_id=user.id if user else None,
        first_name=first_name,
        last_name=last_name,
        is_active=is_active,
        pin_hash=hash_pin(pin) if pin else None,
    )
    db.add(employee)
    db.flush()
    return employee


def make_open_session(
    db: Session,
    *,
    company: Company,
    employee: Employee,
    user: User | None = None,
    method: AttendanceMethod = AttendanceMethod.WEB,
) -> AttendanceSession:
    from datetime import UTC, datetime

    session = AttendanceSession(
        id=uuid.uuid4(),
        company_id=company.id,
        employee_id=employee.id,
        user_id=user.id if user else None,
        clock_in=datetime.now(UTC),
        status=AttendanceStatus.OPEN,
        method=method,
        created_by_user_id=user.id if user else None,
    )
    db.add(session)
    db.flush()
    return session


def auth_headers(user: User) -> dict[str, str]:
    """Return Bearer auth headers for the given user."""
    token = create_access_token(
        user_id=user.id,
        company_id=user.company_id,
        role=user.role.value,
    )
    return {"Authorization": f"Bearer {token}"}
