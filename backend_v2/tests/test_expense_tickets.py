"""Expense ticket endpoint tests.

Covers: list/pagination, employee scoping, admin access, status transitions,
approve/reject/mark-paid actions, cross-tenant isolation, auth guards,
summary endpoint, and validation rules.
"""
from __future__ import annotations

import uuid
from datetime import date

from app.models.enums import ExpenseCategory, ExpenseStatus, PaymentSource, UserRole
from app.models.expense_ticket import ExpenseTicket
from tests.conftest import auth_headers, make_company, make_employee, make_user


# ── Factory helper ────────────────────────────────────────────────────────────

def _make_expense(
    db,
    *,
    company,
    employee,
    user,
    title: str = "Test expense",
    amount: str = "50.00",
    status: ExpenseStatus = ExpenseStatus.PENDING,
    requires_reimbursement: bool = False,
    category: ExpenseCategory = ExpenseCategory.SUPPLIES,
    payment_source: PaymentSource = PaymentSource.PERSONAL_MONEY,
) -> ExpenseTicket:
    ticket = ExpenseTicket(
        id=uuid.uuid4(),
        company_id=company.id,
        employee_id=employee.id,
        created_by_user_id=user.id,
        title=title,
        category=category,
        purchase_date=date(2026, 4, 1),
        amount=amount,
        currency="EUR",
        payment_source=payment_source,
        requires_reimbursement=requires_reimbursement,
        reimbursement_amount=amount if requires_reimbursement else None,
        status=status,
    )
    db.add(ticket)
    db.flush()
    return ticket


# ── List / pagination ─────────────────────────────────────────────────────────

class TestExpenseTicketListShape:
    def test_response_has_pagination_fields(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/expense-tickets", headers=auth_headers(admin))
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
        for i in range(3):
            _make_expense(db, company=company, employee=emp, user=admin, title=f"E{i}")
        db.commit()

        resp = client.get("/expense-tickets", headers=auth_headers(admin))
        assert resp.status_code == 200
        assert resp.json()["total"] == 3

    def test_offset_pagination_works(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        for i in range(5):
            _make_expense(db, company=company, employee=emp, user=admin, title=f"E{i}")
        db.commit()

        resp = client.get("/expense-tickets?limit=2&offset=3", headers=auth_headers(admin))
        data = resp.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2

    def test_status_filter(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        _make_expense(db, company=company, employee=emp, user=admin, status=ExpenseStatus.PENDING)
        _make_expense(db, company=company, employee=emp, user=admin, status=ExpenseStatus.APPROVED)
        db.commit()

        resp = client.get("/expense-tickets?status=approved", headers=auth_headers(admin))
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "approved"

    def test_category_filter(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        _make_expense(db, company=company, employee=emp, user=admin, category=ExpenseCategory.FOOD)
        _make_expense(db, company=company, employee=emp, user=admin, category=ExpenseCategory.REPAIR)
        db.commit()

        resp = client.get("/expense-tickets?category=food", headers=auth_headers(admin))
        assert resp.json()["total"] == 1


# ── Employee scoping ──────────────────────────────────────────────────────────

class TestEmployeeExpenseScoping:
    def test_employee_only_sees_own_expenses(self, client, db):
        company = make_company(db)
        user_a = make_user(db, company=company, email="a@test.com", role=UserRole.EMPLOYEE)
        user_b = make_user(db, company=company, email="b@test.com", role=UserRole.EMPLOYEE)
        emp_a = make_employee(db, company=company, user=user_a)
        emp_b = make_employee(db, company=company, user=user_b)
        _make_expense(db, company=company, employee=emp_a, user=user_a, title="Mine")
        _make_expense(db, company=company, employee=emp_b, user=user_b, title="Other")
        db.commit()

        resp = client.get("/expense-tickets", headers=auth_headers(user_a))
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Mine"

    def test_employee_without_profile_gets_empty_list(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.get("/expense-tickets", headers=auth_headers(user))
        assert resp.json()["total"] == 0

    def test_employee_creates_expense_against_own_profile(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company, user=user)
        db.commit()

        resp = client.post(
            "/expense-tickets",
            headers=auth_headers(user),
            json={
                "title": "Supplies purchase",
                "category": "supplies",
                "purchase_date": "2026-04-01",
                "amount": "25.50",
                "payment_source": "personal_money",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["employee_id"] == str(emp.id)

    def test_employee_cannot_edit_approved_expense(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company, user=user)
        ticket = _make_expense(db, company=company, employee=emp, user=user, status=ExpenseStatus.APPROVED)
        db.commit()

        resp = client.patch(
            f"/expense-tickets/{ticket.id}",
            headers=auth_headers(user),
            json={"title": "Updated"},
        )
        assert resp.status_code == 403

    def test_employee_cannot_delete_in_review_expense(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company, user=user)
        ticket = _make_expense(db, company=company, employee=emp, user=user, status=ExpenseStatus.IN_REVIEW)
        db.commit()

        resp = client.delete(f"/expense-tickets/{ticket.id}", headers=auth_headers(user))
        assert resp.status_code == 403

    def test_employee_can_delete_pending_expense(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company, user=user)
        ticket = _make_expense(db, company=company, employee=emp, user=user, status=ExpenseStatus.PENDING)
        db.commit()

        resp = client.delete(f"/expense-tickets/{ticket.id}", headers=auth_headers(user))
        assert resp.status_code == 204


# ── Admin access ──────────────────────────────────────────────────────────────

class TestAdminExpenseAccess:
    def test_admin_can_list_all_company_expenses(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp1 = make_employee(db, company=company, first_name="E1")
        emp2 = make_employee(db, company=company, first_name="E2")
        _make_expense(db, company=company, employee=emp1, user=admin, title="T1")
        _make_expense(db, company=company, employee=emp2, user=admin, title="T2")
        db.commit()

        resp = client.get("/expense-tickets", headers=auth_headers(admin))
        assert resp.json()["total"] == 2

    def test_admin_can_create_expense_for_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        db.commit()

        resp = client.post(
            "/expense-tickets",
            headers=auth_headers(admin),
            json={
                "title": "Company food",
                "category": "food",
                "purchase_date": "2026-04-01",
                "amount": "120.00",
                "payment_source": "company_card",
                "employee_id": str(emp.id),
            },
        )
        assert resp.status_code == 201
        assert resp.json()["employee_id"] == str(emp.id)

    def test_admin_cannot_create_for_unknown_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/expense-tickets",
            headers=auth_headers(admin),
            json={
                "title": "Bad",
                "category": "food",
                "purchase_date": "2026-04-01",
                "amount": "10.00",
                "payment_source": "personal_money",
                "employee_id": str(uuid.uuid4()),
            },
        )
        assert resp.status_code == 404


# ── Approve / Reject / Mark Paid workflow ─────────────────────────────────────

class TestExpenseWorkflow:
    def test_owner_can_approve_pending_expense(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=owner)
        db.commit()

        resp = client.post(f"/expense-tickets/{ticket.id}/approve", headers=auth_headers(owner))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "approved"
        assert data["approved_by_user_id"] == str(owner.id)

    def test_owner_can_reject_with_reason(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=owner)
        db.commit()

        resp = client.post(
            f"/expense-tickets/{ticket.id}/reject",
            headers=auth_headers(owner),
            json={"rejection_reason": "Fuera de política de gastos"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "rejected"
        assert data["rejection_reason"] == "Fuera de política de gastos"

    def test_reject_requires_reason(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=owner)
        db.commit()

        resp = client.post(
            f"/expense-tickets/{ticket.id}/reject",
            headers=auth_headers(owner),
            json={"rejection_reason": ""},
        )
        assert resp.status_code == 422

    def test_can_mark_approved_expense_as_paid(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=owner, status=ExpenseStatus.APPROVED)
        db.commit()

        resp = client.post(f"/expense-tickets/{ticket.id}/mark-paid", headers=auth_headers(owner), json={})
        assert resp.status_code == 200
        assert resp.json()["status"] == "paid"

    def test_cannot_mark_pending_expense_as_paid(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=owner, status=ExpenseStatus.PENDING)
        db.commit()

        resp = client.post(f"/expense-tickets/{ticket.id}/mark-paid", headers=auth_headers(owner), json={})
        assert resp.status_code == 409

    def test_cannot_mark_rejected_expense_as_paid(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=owner, status=ExpenseStatus.REJECTED)
        db.commit()

        resp = client.post(f"/expense-tickets/{ticket.id}/mark-paid", headers=auth_headers(owner), json={})
        assert resp.status_code == 409

    def test_cannot_approve_paid_expense(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=owner, status=ExpenseStatus.PAID)
        db.commit()

        resp = client.post(f"/expense-tickets/{ticket.id}/approve", headers=auth_headers(owner))
        assert resp.status_code == 409

    def test_employee_cannot_approve(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company, user=user)
        ticket = _make_expense(db, company=company, employee=emp, user=user)
        db.commit()

        resp = client.post(f"/expense-tickets/{ticket.id}/approve", headers=auth_headers(user))
        assert resp.status_code == 403


# ── Summary endpoint ──────────────────────────────────────────────────────────

class TestExpenseSummary:
    def test_summary_returns_correct_totals(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        _make_expense(db, company=company, employee=emp, user=admin, amount="100.00", status=ExpenseStatus.PENDING)
        _make_expense(db, company=company, employee=emp, user=admin, amount="200.00", status=ExpenseStatus.APPROVED)
        _make_expense(db, company=company, employee=emp, user=admin, amount="50.00", status=ExpenseStatus.PAID)
        db.commit()

        resp = client.get("/expense-tickets/summary", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_count"] == 3
        assert data["total_amount"] == 350.0
        assert data["pending_amount"] == 100.0
        assert data["approved_amount"] == 200.0
        assert data["paid_amount"] == 50.0


# ── Cross-tenant isolation ────────────────────────────────────────────────────

class TestExpenseCrossTenant:
    def test_ticket_from_other_company_not_visible(self, client, db):
        co_a = make_company(db, slug="co-a")
        co_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=co_a, email="a@test.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=co_b, email="b@test.com", role=UserRole.ADMIN)
        emp_b = make_employee(db, company=co_b)
        _make_expense(db, company=co_b, employee=emp_b, user=admin_b, title="Secret B")
        db.commit()

        resp = client.get("/expense-tickets", headers=auth_headers(admin_a))
        titles = [t["title"] for t in resp.json()["items"]]
        assert "Secret B" not in titles

    def test_cannot_approve_ticket_from_other_company(self, client, db):
        co_a = make_company(db, slug="co-a")
        co_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=co_a, email="a@test.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=co_b, email="b@test.com", role=UserRole.ADMIN)
        emp_b = make_employee(db, company=co_b)
        ticket_b = _make_expense(db, company=co_b, employee=emp_b, user=admin_b)
        db.commit()

        resp = client.post(f"/expense-tickets/{ticket_b.id}/approve", headers=auth_headers(admin_a))
        assert resp.status_code == 404


# ── Auth guards ───────────────────────────────────────────────────────────────

class TestExpenseAuth:
    def test_unauthenticated_cannot_list(self, client, db):
        db.commit()
        resp = client.get("/expense-tickets")
        assert resp.status_code == 401

    def test_unauthenticated_cannot_create(self, client, db):
        db.commit()
        resp = client.post("/expense-tickets", json={"title": "No auth"})
        assert resp.status_code == 401


# ── Validation ────────────────────────────────────────────────────────────────

class TestExpenseValidation:
    def test_amount_must_be_positive(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        make_employee(db, company=company, user=user)
        db.commit()

        resp = client.post(
            "/expense-tickets",
            headers=auth_headers(user),
            json={
                "title": "Bad amount",
                "category": "food",
                "purchase_date": "2026-04-01",
                "amount": "-5.00",
                "payment_source": "personal_money",
            },
        )
        assert resp.status_code == 422

    def test_purchase_date_cannot_be_future(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        make_employee(db, company=company, user=user)
        db.commit()

        resp = client.post(
            "/expense-tickets",
            headers=auth_headers(user),
            json={
                "title": "Future",
                "category": "food",
                "purchase_date": "2099-12-31",
                "amount": "10.00",
                "payment_source": "personal_money",
            },
        )
        assert resp.status_code == 422

    def test_title_required(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        make_employee(db, company=company, user=user)
        db.commit()

        resp = client.post(
            "/expense-tickets",
            headers=auth_headers(user),
            json={
                "title": "",
                "category": "food",
                "purchase_date": "2026-04-01",
                "amount": "10.00",
                "payment_source": "personal_money",
            },
        )
        assert resp.status_code == 422
