"""Multi-tenancy isolation tests.

Verifies that users from Company A cannot read, write, or reference data
from Company B, regardless of role or token.
"""
import uuid


from tests.conftest import auth_headers, make_company, make_employee, make_user
from app.models.enums import UserRole


class TestCrossTenantRead:
    def test_cannot_read_employee_from_other_company(self, client, db):
        co_a = make_company(db, slug="company-a")
        co_b = make_company(db, slug="company-b")
        admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
        emp_b = make_employee(db, company=co_b, first_name="Other", last_name="Company")
        db.commit()

        resp = client.get(f"/employees/{emp_b.id}", headers=auth_headers(admin_a))
        assert resp.status_code == 404

    def test_employee_list_only_returns_own_company(self, client, db):
        co_a = make_company(db, slug="company-a")
        co_b = make_company(db, slug="company-b")
        admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
        make_employee(db, company=co_a, first_name="A1", last_name="Employee")
        make_employee(db, company=co_b, first_name="B1", last_name="Employee")
        db.commit()

        resp = client.get("/employees", headers=auth_headers(admin_a))
        assert resp.status_code == 200
        names = [e["first_name"] for e in resp.json()["items"]]
        assert "A1" in names
        assert "B1" not in names

    def test_cannot_read_user_from_other_company(self, client, db):
        co_a = make_company(db, slug="company-a")
        co_b = make_company(db, slug="company-b")
        owner_a = make_user(db, company=co_a, email="owner@a.com", role=UserRole.OWNER)
        user_b = make_user(db, company=co_b, email="user@b.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.get(f"/users/{user_b.id}", headers=auth_headers(owner_a))
        assert resp.status_code == 404

    def test_users_list_only_returns_own_company(self, client, db):
        co_a = make_company(db, slug="company-a")
        co_b = make_company(db, slug="company-b")
        owner_a = make_user(db, company=co_a, email="owner@a.com", role=UserRole.OWNER)
        make_user(db, company=co_b, email="other@b.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/users", headers=auth_headers(owner_a))
        assert resp.status_code == 200
        emails = [u["email"] for u in resp.json()["items"]]
        assert "owner@a.com" in emails
        assert "other@b.com" not in emails


class TestCrossTenantWrite:
    def test_cannot_update_employee_from_other_company(self, client, db):
        co_a = make_company(db, slug="company-a")
        co_b = make_company(db, slug="company-b")
        admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
        emp_b = make_employee(db, company=co_b, first_name="Other", last_name="Company")
        db.commit()

        resp = client.patch(
            f"/employees/{emp_b.id}",
            headers=auth_headers(admin_a),
            json={"first_name": "Hacked"},
        )
        assert resp.status_code == 404

    def test_cannot_change_role_of_user_from_other_company(self, client, db):
        co_a = make_company(db, slug="company-a")
        co_b = make_company(db, slug="company-b")
        owner_a = make_user(db, company=co_a, email="owner@a.com", role=UserRole.OWNER)
        user_b = make_user(db, company=co_b, email="user@b.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.patch(
            f"/users/{user_b.id}/role",
            headers=auth_headers(owner_a),
            json={"role": "employee"},
        )
        assert resp.status_code == 404

    def test_clock_in_for_employee_from_other_company_rejected(self, client, db):
        co_a = make_company(db, slug="company-a")
        co_b = make_company(db, slug="company-b")
        admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
        emp_b = make_employee(db, company=co_b, first_name="Other", last_name="Company")
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin_a),
            json={"employee_id": str(emp_b.id)},
        )
        assert resp.status_code == 404

    def test_nonexistent_employee_id_in_clock_in_rejected(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(admin),
            json={"employee_id": str(uuid.uuid4())},
        )
        assert resp.status_code == 404
