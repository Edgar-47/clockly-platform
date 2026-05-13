"""Security hardening tests.

Covers: JWT integrity, token forgery, missing auth, tampered payloads,
privilege-escalation attempts, and password hashing.
"""
import uuid


from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import UserRole
from app.services.xlsx_report import safe_spreadsheet_value
from tests.conftest import auth_headers, make_company, make_user


# ─── Password hashing ─────────────────────────────────────────────────────────

def test_password_hash_roundtrip():
    stored = hash_password("Admin12345")
    assert stored != "Admin12345"
    assert verify_password("Admin12345", stored)
    assert not verify_password("wrong", stored)


def test_different_passwords_produce_different_hashes():
    h1 = hash_password("passwordA")
    h2 = hash_password("passwordB")
    assert h1 != h2


# ─── Missing / invalid auth ───────────────────────────────────────────────────

def test_spreadsheet_export_values_are_formula_safe():
    assert safe_spreadsheet_value('=HYPERLINK("https://evil.test")').startswith("'=")
    assert safe_spreadsheet_value(" +SUM(1,1)").startswith("' ")
    assert safe_spreadsheet_value("@cmd").startswith("'@")
    assert safe_spreadsheet_value("Normal value") == "Normal value"


def test_no_auth_header_returns_401(client, db):
    db.commit()
    resp = client.get("/employees")
    assert resp.status_code == 401


def test_invalid_bearer_token_returns_401(client, db):
    db.commit()
    resp = client.get("/employees", headers={"Authorization": "Bearer not.a.jwt"})
    assert resp.status_code == 401


def test_garbage_bearer_scheme_returns_401(client, db):
    db.commit()
    resp = client.get("/auth/me", headers={"Authorization": "Basic dXNlcjpwYXNz"})
    assert resp.status_code == 401


def test_empty_bearer_token_returns_401(client, db):
    db.commit()
    resp = client.get("/auth/me", headers={"Authorization": "Bearer "})
    assert resp.status_code == 401


# ─── Token with non-existent user ─────────────────────────────────────────────

def test_token_for_nonexistent_user_returns_401(client, db):
    fake_company_id = uuid.uuid4()
    fake_user_id = uuid.uuid4()
    token = create_access_token(
        user_id=fake_user_id,
        company_id=fake_company_id,
        role=UserRole.ADMIN.value,
    )
    db.commit()
    resp = client.get("/employees", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_token_for_inactive_user_returns_401(client, db):
    company = make_company(db)
    user = make_user(db, company=company, email="inactive@test.com", role=UserRole.ADMIN, is_active=False)
    db.commit()

    token = create_access_token(
        user_id=user.id,
        company_id=user.company_id,
        role=UserRole.ADMIN.value,
    )
    resp = client.get("/employees", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


# ─── Privilege escalation via token manipulation ──────────────────────────────

def test_employee_with_forged_admin_token_cannot_list_employees(client, db):
    """Even if someone forges a token with admin role but uses an employee user_id,
    the backend must re-check the real role from the DB."""
    company = make_company(db)
    user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
    db.commit()

    # Create a JWT that claims admin role but belongs to an employee user
    forged_token = create_access_token(
        user_id=user.id,
        company_id=user.company_id,
        role=UserRole.ADMIN.value,  # lie about role
    )
    resp = client.get("/employees", headers={"Authorization": f"Bearer {forged_token}"})
    # The backend loads user from DB and checks real role — employee has no employees:read
    assert resp.status_code == 403


# ─── Superadmin isolation ─────────────────────────────────────────────────────

def test_superadmin_cannot_access_tenant_employees(client, db):
    company = make_company(db)
    superadmin = make_user(db, company=company, email="root@test.com", role=UserRole.SUPERADMIN)
    db.commit()

    resp = client.get("/employees", headers=auth_headers(superadmin))
    assert resp.status_code == 403


def test_superadmin_cannot_access_tenant_metrics(client, db):
    company = make_company(db, plan="pro")
    superadmin = make_user(db, company=company, email="root@test.com", role=UserRole.SUPERADMIN)
    db.commit()

    resp = client.get("/metrics/overview", headers=auth_headers(superadmin))
    assert resp.status_code == 403


def test_superadmin_can_access_superadmin_endpoint(client, db):
    company = make_company(db)
    superadmin = make_user(db, company=company, email="root@test.com", role=UserRole.SUPERADMIN)
    db.commit()

    resp = client.get("/superadmin/status", headers=auth_headers(superadmin))
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


# ─── Cross-tenant token reuse ─────────────────────────────────────────────────

def test_token_from_company_a_cannot_read_company_b_employees(client, db):
    co_a = make_company(db, slug="co-a")
    co_b = make_company(db, slug="co-b")
    admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
    make_user(db, company=co_b, email="admin@b.com", role=UserRole.ADMIN)
    db.commit()

    from app.models.employee import Employee
    emp_b = Employee(
        id=uuid.uuid4(),
        company_id=co_b.id,
        first_name="B",
        last_name="Employee",
        is_active=True,
    )
    db.add(emp_b)
    db.commit()

    resp = client.get(f"/employees/{emp_b.id}", headers=auth_headers(admin_a))
    assert resp.status_code == 404
