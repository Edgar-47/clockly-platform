"""Run from backend_v2/: python seed.py

Creates a local demo company plus an owner user.
Optionally creates a superadmin account when explicit credentials are provided.
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.company_settings import CompanySettings
from app.models.enums import PlanType, UserRole
from app.models.user import User
from app.services.plans import apply_plan_to_company


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Seed local ClockLy demo data.")
    parser.add_argument("--company-name", default="ClockLy Demo")
    parser.add_argument("--company-slug", default="clockly-demo")
    parser.add_argument("--timezone", default="Europe/Madrid")
    parser.add_argument("--plan", choices=[plan.value for plan in PlanType], default=PlanType.PRO.value)
    parser.add_argument("--owner-email", default="owner@clockly.local")
    parser.add_argument("--owner-password", default=None,
                        help="REQUIRED: password for the owner account (min 12 chars recommended)")
    parser.add_argument("--owner-name", default="ClockLy Owner")
    parser.add_argument("--superadmin-email", default=os.getenv("CLOCKLY_SUPERADMIN_EMAIL"))
    parser.add_argument("--superadmin-password", default=os.getenv("CLOCKLY_SUPERADMIN_PASSWORD"))
    parser.add_argument("--superadmin-name", default=os.getenv("CLOCKLY_SUPERADMIN_NAME", "ClockLy Superadmin"))
    return parser


def seed(args: argparse.Namespace) -> None:
    if not args.owner_password:
        raise SystemExit(
            "Error: --owner-password is required. "
            "Choose a strong password (min 12 chars) for the owner account."
        )
    db = SessionLocal()
    try:
        company = db.query(Company).filter_by(slug=args.company_slug).first()
        if not company:
            company = apply_plan_to_company(
                Company(
                    name=args.company_name,
                    slug=args.company_slug,
                    timezone=args.timezone,
                ),
                args.plan,
            )
            db.add(company)
            db.flush()
            print(f"Empresa creada: {company.name} (id={company.id})")
        else:
            apply_plan_to_company(company, args.plan)
            print(f"Empresa ya existe: {company.name}")

        owner = db.query(User).filter_by(email=args.owner_email.lower()).first()
        if not owner:
            owner = User(
                company_id=company.id,
                email=args.owner_email.lower(),
                full_name=args.owner_name,
                password_hash=hash_password(args.owner_password),
                role=UserRole.OWNER,
                is_active=True,
            )
            db.add(owner)
            db.flush()
            print(f"Owner creado: {owner.email} (rol={UserRole.OWNER.value})")
        else:
            print(f"Owner ya existe: {owner.email}")

        if company.created_by is None:
            company.created_by = owner.id

        settings = db.query(CompanySettings).filter_by(company_id=company.id).first()
        if not settings:
            db.add(CompanySettings(company_id=company.id, onboarding_step="complete"))

        if args.superadmin_email or args.superadmin_password:
            if not args.superadmin_email or not args.superadmin_password:
                raise ValueError("Provide both --superadmin-email and --superadmin-password to create a superadmin.")
            superadmin = db.query(User).filter_by(email=args.superadmin_email.lower()).first()
            if not superadmin:
                superadmin = User(
                    company_id=company.id,
                    email=args.superadmin_email.lower(),
                    full_name=args.superadmin_name,
                    password_hash=hash_password(args.superadmin_password),
                    role=UserRole.SUPERADMIN,
                    is_active=True,
                )
                db.add(superadmin)
                print(f"Superadmin creado: {superadmin.email} (rol={UserRole.SUPERADMIN.value})")
            else:
                superadmin.role = UserRole.SUPERADMIN
                print(f"Superadmin ya existe y queda marcado como SUPERADMIN: {superadmin.email}")
        else:
            print("Superadmin omitido. Usa --superadmin-email y --superadmin-password si lo necesitas.")

        db.commit()
        print("Seed completado.")
    except Exception as exc:
        db.rollback()
        print(f"Error: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed(build_parser().parse_args())
