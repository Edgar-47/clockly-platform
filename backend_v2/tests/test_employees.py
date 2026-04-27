"""Employee lifecycle tests.

Covers: create, update, deactivate, reactivate, PIN reset,
password reset, User/Employee consistency, plan limits.
"""

from datetime import date

from tests.conftest import auth_headers, make_company, make_employee, make_user
from app.models.enums import UserRole


class TestCreateEmployee:
    def test_create_employee_basic(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/employees",
            headers=auth_headers(admin),
            json={"first_name": "Maria", "last_name": "Lopez"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["first_name"] == "Maria"
        assert data["company_id"] == str(company.id)
        assert data["is_active"] is True

    def test_create_employee_with_login(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/employees",
            headers=auth_headers(admin),
            json={
                "first_name": "Carlos",
                "last_name": "Ruiz",
                "email": "carlos@test.com",
                "password": "secure-pass-123",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["user_id"] is not None

    def test_create_employee_duplicate_email_rejected(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        client.post(
            "/employees",
            headers=auth_headers(admin),
            json={"first_name": "Ana", "last_name": "Garcia", "email": "dup@test.com", "password": "pass-123-abc"},
        )
        resp = client.post(
            "/employees",
            headers=auth_headers(admin),
            json={"first_name": "Otro", "last_name": "User", "email": "dup@test.com", "password": "pass-123-xyz"},
        )
        assert resp.status_code == 409

    def test_create_employee_with_pin(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/employees",
            headers=auth_headers(admin),
            json={"first_name": "Pedro", "last_name": "Diaz", "pin": "5678"},
        )
        assert resp.status_code == 201
        assert resp.json()["has_pin"] is True

    def test_create_employee_invalid_pin_rejected(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/employees",
            headers=auth_headers(admin),
            json={"first_name": "Pedro", "last_name": "Diaz", "pin": "ABCD"},
        )
        assert resp.status_code == 422

    def test_create_employee_password_without_email_rejected(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/employees",
            headers=auth_headers(admin),
            json={"first_name": "Luis", "last_name": "Torres", "password": "pass-no-email-123"},
        )
        assert resp.status_code == 422

    def test_free_plan_employee_limit_enforced(self, client, db):
        company = make_company(db, plan="free")  # max 5 employees
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        for i in range(5):
            make_employee(db, company=company, first_name=f"Emp{i}", last_name="Test")
        db.commit()

        resp = client.post(
            "/employees",
            headers=auth_headers(admin),
            json={"first_name": "Sixth", "last_name": "Employee"},
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "plan_limit_reached"


class TestUpdateEmployee:
    def test_update_employee_name(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company, first_name="Old", last_name="Name")
        db.commit()

        resp = client.patch(
            f"/employees/{emp.id}",
            headers=auth_headers(admin),
            json={"first_name": "New"},
        )
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "New"

    def test_update_employee_hired_on(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        db.commit()

        resp = client.patch(
            f"/employees/{emp.id}",
            headers=auth_headers(admin),
            json={"hired_on": "2026-04-15"},
        )

        assert resp.status_code == 200
        assert resp.json()["hired_on"] == "2026-04-15"
        db.refresh(emp)
        assert emp.hired_on == date(2026, 4, 15)

    def test_deactivate_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        db.commit()

        resp = client.patch(
            f"/employees/{emp.id}",
            headers=auth_headers(admin),
            json={"is_active": False},
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_deactivate_employee_also_deactivates_user(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp_user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company, user=emp_user)
        db.commit()

        client.patch(
            f"/employees/{emp.id}",
            headers=auth_headers(admin),
            json={"is_active": False},
        )
        db.expire_all()
        db.refresh(emp_user)
        assert emp_user.is_active is False

    def test_reactivate_employee_also_reactivates_user(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp_user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE, is_active=False)
        emp = make_employee(db, company=company, user=emp_user, is_active=False)
        db.commit()

        client.patch(
            f"/employees/{emp.id}",
            headers=auth_headers(admin),
            json={"is_active": True},
        )
        db.expire_all()
        db.refresh(emp_user)
        assert emp_user.is_active is True

    def test_reset_pin(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company, pin="1234")
        db.commit()

        resp = client.patch(
            f"/employees/{emp.id}",
            headers=auth_headers(admin),
            json={"pin": "5678"},
        )
        assert resp.status_code == 200
        assert resp.json()["has_pin"] is True

    def test_clear_pin(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company, pin="1234")
        db.commit()

        resp = client.patch(
            f"/employees/{emp.id}",
            headers=auth_headers(admin),
            json={"pin": None},
        )
        assert resp.status_code == 200
        assert resp.json()["has_pin"] is False

    def test_update_nonexistent_employee_returns_404(self, client, db):
        import uuid

        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.patch(
            f"/employees/{uuid.uuid4()}",
            headers=auth_headers(admin),
            json={"first_name": "Ghost"},
        )
        assert resp.status_code == 404


class TestEmployeePagination:
    def test_list_employees_pagination(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        for i in range(5):
            make_employee(db, company=company, first_name=f"Emp{i}", last_name="Test")
        db.commit()

        resp = client.get("/employees?limit=3&offset=0", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 3
        assert data["total"] == 5

        resp2 = client.get("/employees?limit=3&offset=3", headers=auth_headers(admin))
        data2 = resp2.json()
        assert len(data2["items"]) == 2
