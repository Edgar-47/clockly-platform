"""Pytest fixtures for ClockLy backend tests.

The backend test suite runs against real PostgreSQL. By default it starts a
PostgreSQL 16 container via testcontainers, applies Alembic migrations once,
and truncates all ORM tables before each test for isolation.

Set CLOCKLY_TEST_DATABASE_URL to use an already-running PostgreSQL database
instead of Docker. SQLite is intentionally not supported for backend tests.
"""
from __future__ import annotations

import os
import uuid
from collections.abc import Generator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

os.environ.setdefault("CLOCKLY_ENV", "test")
os.environ.setdefault("CLOCKLY_SECRET_KEY", "test-secret-key-for-clockly-backend-tests")
os.environ.setdefault("CLOCKLY_RATE_LIMIT_BACKEND", "memory")
os.environ.setdefault("CLOCKLY_EMAIL_PROVIDER", "noop")
os.environ.setdefault("CLOCKLY_LOG_FORMAT", "json")

from app.core.config import get_settings
from app.core.rate_limit import (
    export_limiter,
    gdpr_export_limiter,
    gdpr_limiter,
    invitation_limiter,
    kiosk_limiter,
    login_limiter,
    password_reset_limiter,
    refresh_limiter,
    registration_limiter,
    upload_limiter,
)
from app.core.security import create_access_token, hash_password, hash_pin
from app.db.base import Base
from app.models.attendance_incident import AttendanceIncident  # noqa: F401
from app.models.attendance_session import AttendanceSession
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.cash_closure import CashClosure, CashClosureCardTerminal, CashClosureDrawer  # noqa: F401
from app.models.company import Company
from app.models.company_location import CompanyLocation  # noqa: F401
from app.models.company_settings import CompanySettings  # noqa: F401
from app.models.company_usage_log import CompanyUsageLog  # noqa: F401
from app.models.employee import Employee
from app.models.enums import AttendanceMethod, AttendanceStatus, UserRole
from app.models.expense_ticket import ExpenseTicket  # noqa: F401
from app.models.expense_ticket_event import ExpenseTicketEvent  # noqa: F401
from app.models.geo_consent_log import GeoConsentLog  # noqa: F401
from app.models.late_arrival import LateArrival  # noqa: F401
from app.models.password_reset_token import PasswordResetToken  # noqa: F401
from app.models.refresh_token import RefreshToken  # noqa: F401
from app.models.salary import SalaryCalculation, SalaryProfile  # noqa: F401
from app.models.schedule import Schedule  # noqa: F401
from app.models.stripe_webhook_event import StripeWebhookEvent  # noqa: F401
from app.models.ticket import Ticket  # noqa: F401
from app.models.user import User
from app.models.user_invitation import UserInvitation  # noqa: F401
from app.services.plans import apply_plan_to_company


BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def postgres_url() -> Generator[str, None, None]:
    external_url = os.environ.get("CLOCKLY_TEST_DATABASE_URL")
    if external_url:
        yield _normalize_postgres_url(external_url)
        return

    try:
        from testcontainers.postgres import PostgresContainer
    except ModuleNotFoundError as exc:
        pytest.fail(
            "testcontainers[postgres] is required. Install requirements.txt or set "
            "CLOCKLY_TEST_DATABASE_URL to a real PostgreSQL test database."
        )
        raise exc

    try:
        with PostgresContainer("postgres:16-alpine", driver="psycopg") as postgres:
            yield _normalize_postgres_url(postgres.get_connection_url())
    except Exception as exc:
        pytest.fail(
            "Could not start PostgreSQL testcontainer. Start Docker Desktop or set "
            "CLOCKLY_TEST_DATABASE_URL to a dedicated PostgreSQL test database."
        )
        raise exc


@pytest.fixture(scope="session")
def migrated_database_url(postgres_url: str) -> str:
    os.environ["DATABASE_URL"] = postgres_url
    os.environ["CLOCKLY_DATABASE_URL"] = postgres_url
    get_settings.cache_clear()

    alembic_cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", postgres_url.replace("%", "%%"))
    command.upgrade(alembic_cfg, "head")
    return postgres_url


@pytest.fixture(scope="session")
def engine(migrated_database_url: str) -> Generator[Engine, None, None]:
    engine = create_engine(migrated_database_url, pool_pre_ping=True, future=True)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture(autouse=True)
def reset_rate_limiters():
    """Clear in-memory rate limiter state before each test to prevent interference."""
    for limiter in (
        login_limiter,
        registration_limiter,
        password_reset_limiter,
        refresh_limiter,
        kiosk_limiter,
        invitation_limiter,
        export_limiter,
        gdpr_limiter,
        gdpr_export_limiter,
        upload_limiter,
    ):
        limiter._buckets.clear()
    yield


@pytest.fixture
def db(engine: Engine) -> Generator[Session, None, None]:
    _truncate_database(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        _truncate_database(engine)


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    from app.db.session import get_db
    from app.main import app

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _truncate_database(engine: Engine) -> None:
    table_names = [table.name for table in reversed(Base.metadata.sorted_tables)]
    if not table_names:
        return
    preparer = engine.dialect.identifier_preparer
    tables_sql = ", ".join(preparer.quote(name) for name in table_names)
    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE TABLE {tables_sql} RESTART IDENTITY CASCADE"))


def _normalize_postgres_url(url: str) -> str:
    clean = url.strip()
    if clean.startswith("postgresql+psycopg2://"):
        return "postgresql+psycopg://" + clean.removeprefix("postgresql+psycopg2://")
    if clean.startswith("postgres://"):
        return "postgresql+psycopg://" + clean.removeprefix("postgres://")
    if clean.startswith("postgresql://"):
        return "postgresql+psycopg://" + clean.removeprefix("postgresql://")
    return clean


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
    is_deleted: bool = False,
) -> User:
    user = User(
        id=uuid.uuid4(),
        company_id=company.id,
        email=email,
        full_name="Test User",
        password_hash=hash_password(password),
        role=role,
        is_active=is_active,
        is_deleted=is_deleted,
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
    is_deleted: bool = False,
) -> Employee:
    employee = Employee(
        id=uuid.uuid4(),
        company_id=company.id,
        user_id=user.id if user else None,
        first_name=first_name,
        last_name=last_name,
        is_active=is_active,
        is_deleted=is_deleted,
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
    token = create_access_token(
        user_id=user.id,
        company_id=user.company_id,
        role=user.role.value,
    )
    return {"Authorization": f"Bearer {token}"}
