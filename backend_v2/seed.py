"""Run from backend_v2/: python seed.py"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import hash_password

def seed() -> None:
    db = SessionLocal()
    try:
        company = db.query(Company).filter_by(slug="edgar-demo").first()
        if not company:
            company = Company(
                name="Edgar Demo",
                slug="edgar-demo",
                timezone="Europe/Madrid",
            )
            db.add(company)
            db.flush()
            print(f"Empresa creada: {company.name} (id={company.id})")
        else:
            print(f"Empresa ya existe: {company.name}")

        user = db.query(User).filter_by(email="edgar@edgar.com").first()
        if not user:
            user = User(
                company_id=company.id,
                email="edgar@edgar.com",
                full_name="Edgar Admin",
                password_hash=hash_password("Admin123"),
                role=UserRole.OWNER,
                is_active=True,
            )
            db.add(user)
            print(f"Usuario creado: {user.email} (rol={user.role})")
        else:
            print(f"Usuario ya existe: {user.email}")

        db.commit()
        print("Seed completado.")
    except Exception as exc:
        db.rollback()
        print(f"Error: {exc}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
