from __future__ import annotations

import argparse
import os
import sys
from collections.abc import Iterable
from pathlib import Path
from uuid import UUID

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models as _models  # noqa: F401 - populate SQLAlchemy metadata
from app.db.base import Base
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.employee import Employee
from app.models.user import User


LEGACY_COMPANY_PATTERNS = (
    "ClockLy Smoke %",
    "ClockLy Billing Smoke %",
)
LEGACY_EMAIL_PATTERNS = (
    "clockly-smoke-%@example.invalid",
    "clockly-billing-smoke-%@example.invalid",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Find or delete ClockLy smoke-test data.")
    parser.add_argument(
        "--smoke-run-id",
        help="Restrict cleanup to one smoke run id, for example smoke_20260514123000.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print what would be deleted. This is the default unless --confirm is passed.",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Actually delete matching smoke data.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dry_run = not args.confirm
    if args.confirm and not args.smoke_run_id and os.getenv("CLOCKLY_ALLOW_SMOKE_CLEANUP") != "true":
        print(
            "Refusing broad smoke cleanup without CLOCKLY_ALLOW_SMOKE_CLEANUP=true. "
            "Pass --smoke-run-id for targeted cleanup.",
            file=sys.stderr,
        )
        return 2

    with SessionLocal() as session:
        company_ids = find_smoke_company_ids(session, smoke_run_id=args.smoke_run_id)
        print_diagnostics(session, company_ids, smoke_run_id=args.smoke_run_id)
        if not company_ids:
            print("No smoke data matched.")
            print("SMOKE_CLEANUP_OK")
            return 0
        if dry_run:
            print("Dry-run only. Re-run with --confirm to delete these rows.")
            print("SMOKE_CLEANUP_DRY_RUN")
            return 0
        delete_counts = delete_smoke_data(session, company_ids)
        session.commit()
        print("Deleted rows:")
        for table_name, count in delete_counts:
            if count:
                print(f"- {table_name}: {count}")
        print("SMOKE_CLEANUP_OK")
        return 0


def find_smoke_company_ids(session: Session, *, smoke_run_id: str | None) -> list[UUID]:
    company_conditions = []
    user_conditions = []

    if smoke_run_id:
        marker = f"%{smoke_run_id}%"
        company_conditions.extend(
            [
                Company.name.ilike(marker),
                Company.slug.ilike(marker.replace("_", "-")),
            ]
        )
        user_conditions.extend(
            [
                User.email.ilike(marker),
                User.full_name.ilike(marker),
            ]
        )
    else:
        company_conditions.extend(Company.name.like(pattern) for pattern in LEGACY_COMPANY_PATTERNS)
        user_conditions.extend(User.email.like(pattern) for pattern in LEGACY_EMAIL_PATTERNS)

    company_ids: set[UUID] = set()
    if company_conditions:
        company_ids.update(session.scalars(select(Company.id).where(or_(*company_conditions))).all())
    if user_conditions:
        company_ids.update(session.scalars(select(User.company_id).where(or_(*user_conditions))).all())
    return sorted(company_ids, key=str)


def print_diagnostics(session: Session, company_ids: list[UUID], *, smoke_run_id: str | None) -> None:
    label = smoke_run_id or "legacy smoke patterns"
    print(f"Smoke selector: {label}")
    print(f"Matched companies: {len(company_ids)}")
    if not company_ids:
        return

    companies = session.scalars(select(Company).where(Company.id.in_(company_ids)).order_by(Company.created_at)).all()
    print("Companies:")
    for company in companies:
        stripe_bits = []
        if company.stripe_customer_id:
            stripe_bits.append("stripe_customer_id=set")
        if company.stripe_subscription_id:
            stripe_bits.append("stripe_subscription_id=set")
        if company.stripe_subscription_status:
            stripe_bits.append(f"stripe_subscription_status={company.stripe_subscription_status}")
        suffix = f" ({', '.join(stripe_bits)})" if stripe_bits else ""
        print(f"- {company.id} | {company.name} | slug={company.slug}{suffix}")

    users = session.scalars(select(User).where(User.company_id.in_(company_ids)).order_by(User.email)).all()
    print(f"Users: {len(users)}")
    for user in users:
        print(f"- {user.id} | {user.email} | role={user.role.value} | company_id={user.company_id}")

    employees = session.scalars(
        select(Employee).where(Employee.company_id.in_(company_ids)).order_by(Employee.created_at)
    ).all()
    print(f"Employees: {len(employees)}")
    for employee in employees:
        print(f"- {employee.id} | {employee.full_name} | email={employee.email or '<none>'}")

    print("Related rows by table:")
    for table_name, count in related_counts(session, company_ids):
        if count:
            print(f"- {table_name}: {count}")


def related_counts(session: Session, company_ids: list[UUID]) -> list[tuple[str, int]]:
    counts: list[tuple[str, int]] = []
    for table in Base.metadata.sorted_tables:
        condition = condition_for_company_ids(table.name, company_ids)
        if condition is None:
            continue
        count = session.execute(select(func.count()).select_from(table).where(condition)).scalar_one()
        counts.append((table.name, int(count)))
    return counts


def delete_smoke_data(session: Session, company_ids: list[UUID]) -> list[tuple[str, int]]:
    counts: list[tuple[str, int]] = []
    for table in reversed(Base.metadata.sorted_tables):
        condition = condition_for_company_ids(table.name, company_ids)
        if condition is None:
            continue
        result = session.execute(delete(table).where(condition))
        counts.append((table.name, int(result.rowcount or 0)))
    return counts


def condition_for_company_ids(table_name: str, company_ids: Iterable[UUID]):
    ids = list(company_ids)
    table = Base.metadata.tables[table_name]
    tables = Base.metadata.tables

    if table_name == "companies":
        return table.c.id.in_(ids)
    if "company_id" in table.c:
        return table.c.company_id.in_(ids)
    if table_name == "affiliate_referrals":
        return table.c.referred_company_id.in_(ids)
    if table_name in {"cash_closure_drawers", "cash_closure_card_terminals"}:
        closures = tables["cash_closures"]
        return table.c.closure_id.in_(select(closures.c.id).where(closures.c.company_id.in_(ids)))
    if table_name == "expense_ticket_events":
        tickets = tables["expense_tickets"]
        return table.c.ticket_id.in_(select(tickets.c.id).where(tickets.c.company_id.in_(ids)))
    return None


if __name__ == "__main__":
    raise SystemExit(main())
