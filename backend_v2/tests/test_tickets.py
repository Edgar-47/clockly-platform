"""Ticket endpoint tests.

Covers: employee scoping, admin list-all, cross-tenant isolation,
paginated response shape, and creation validation.
"""
import uuid


from app.models.enums import UserRole
from app.models.ticket import Ticket
from tests.conftest import auth_headers, make_company, make_employee, make_user


def _create_ticket(db, *, company, employee, user, title="Test ticket"):
    ticket = Ticket(
        id=uuid.uuid4(),
        company_id=company.id,
        employee_id=employee.id,
        user_id=user.id,
        title=title,
    )
    db.add(ticket)
    db.flush()
    return ticket


class TestTicketListShape:
    def test_response_includes_pagination_fields(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/tickets", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data

    def test_total_reflects_actual_count(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        _create_ticket(db, company=company, employee=emp, user=admin, title="T1")
        _create_ticket(db, company=company, employee=emp, user=admin, title="T2")
        _create_ticket(db, company=company, employee=emp, user=admin, title="T3")
        db.commit()

        resp = client.get("/tickets", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    def test_offset_pagination_works(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        for i in range(5):
            _create_ticket(db, company=company, employee=emp, user=admin, title=f"T{i}")
        db.commit()

        resp = client.get("/tickets?limit=2&offset=3", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2
        assert data["limit"] == 2
        assert data["offset"] == 3


class TestEmployeeTicketScoping:
    def test_employee_only_sees_own_tickets(self, client, db):
        company = make_company(db)
        user_a = make_user(db, company=company, email="emp_a@test.com", role=UserRole.EMPLOYEE)
        user_b = make_user(db, company=company, email="emp_b@test.com", role=UserRole.EMPLOYEE)
        emp_a = make_employee(db, company=company, user=user_a)
        emp_b = make_employee(db, company=company, user=user_b)
        _create_ticket(db, company=company, employee=emp_a, user=user_a, title="A ticket")
        _create_ticket(db, company=company, employee=emp_b, user=user_b, title="B ticket")
        db.commit()

        resp = client.get("/tickets", headers=auth_headers(user_a))
        assert resp.status_code == 200
        data = resp.json()
        titles = [t["title"] for t in data["items"]]
        assert "A ticket" in titles
        assert "B ticket" not in titles
        assert data["total"] == 1

    def test_employee_without_profile_sees_empty_list(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.get("/tickets", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_employee_creates_ticket_against_own_profile(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company, user=user)
        db.commit()

        resp = client.post(
            "/tickets",
            headers=auth_headers(user),
            json={"title": "My issue", "description": "Something happened"},
        )
        assert resp.status_code == 201
        assert resp.json()["employee_id"] == str(emp.id)

    def test_employee_cannot_create_ticket_for_another_employee(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        make_employee(db, company=company, user=user)
        other_emp = make_employee(db, company=company, first_name="Other")
        db.commit()

        resp = client.post(
            "/tickets",
            headers=auth_headers(user),
            json={"title": "Fake", "employee_id": str(other_emp.id)},
        )
        assert resp.status_code == 201
        # employee_id in response must be own profile, not the supplied other_emp
        assert resp.json()["employee_id"] != str(other_emp.id)


class TestAdminTicketAccess:
    def test_admin_can_list_all_tickets(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp1 = make_employee(db, company=company, first_name="E1")
        emp2 = make_employee(db, company=company, first_name="E2")
        _create_ticket(db, company=company, employee=emp1, user=admin, title="T1")
        _create_ticket(db, company=company, employee=emp2, user=admin, title="T2")
        db.commit()

        resp = client.get("/tickets", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2

    def test_admin_can_create_ticket_for_specific_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        db.commit()

        resp = client.post(
            "/tickets",
            headers=auth_headers(admin),
            json={"title": "Report", "employee_id": str(emp.id)},
        )
        assert resp.status_code == 201
        assert resp.json()["employee_id"] == str(emp.id)

    def test_admin_cannot_create_ticket_for_unknown_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/tickets",
            headers=auth_headers(admin),
            json={"title": "Bad", "employee_id": str(uuid.uuid4())},
        )
        assert resp.status_code == 404


class TestTicketCrossTenant:
    def test_ticket_from_other_company_not_visible(self, client, db):
        co_a = make_company(db, slug="co-a")
        co_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
        emp_b = make_employee(db, company=co_b, first_name="B")
        admin_b = make_user(db, company=co_b, email="admin@b.com", role=UserRole.ADMIN)
        _create_ticket(db, company=co_b, employee=emp_b, user=admin_b, title="B secret")
        db.commit()

        resp = client.get("/tickets", headers=auth_headers(admin_a))
        assert resp.status_code == 200
        titles = [t["title"] for t in resp.json()["items"]]
        assert "B secret" not in titles

    def test_cannot_create_ticket_for_employee_from_other_company(self, client, db):
        co_a = make_company(db, slug="co-a")
        co_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
        emp_b = make_employee(db, company=co_b, first_name="B")
        db.commit()

        resp = client.post(
            "/tickets",
            headers=auth_headers(admin_a),
            json={"title": "Exploit", "employee_id": str(emp_b.id)},
        )
        assert resp.status_code == 404


class TestTicketAuth:
    def test_unauthenticated_cannot_list_tickets(self, client, db):
        db.commit()
        resp = client.get("/tickets")
        assert resp.status_code == 401

    def test_unauthenticated_cannot_create_ticket(self, client, db):
        db.commit()
        resp = client.post("/tickets", json={"title": "No auth"})
        assert resp.status_code == 401
