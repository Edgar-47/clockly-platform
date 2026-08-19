"""Expense ticket endpoint tests.

Covers: list/pagination, employee scoping, admin access, status transitions,
approve/reject/mark-paid actions, cross-tenant isolation, auth guards,
summary endpoint, and validation rules.
"""
from __future__ import annotations

import uuid
from datetime import date
from io import BytesIO

from app.models.enums import ExpenseCategory, ExpenseStatus, PaymentSource, UserRole
from app.models.expense_ticket import ExpenseTicket
from app.services.storage import StoredObject, StorageNotFoundError, get_storage_backend
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

    def test_employee_without_profile_gets_empty_summary(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        emp = make_employee(db, company=company)
        _make_expense(db, company=company, employee=emp, user=admin, amount="99.00")
        db.commit()

        resp = client.get("/expense-tickets/summary", headers=auth_headers(user))

        assert resp.status_code == 200
        data = resp.json()
        assert data["total_count"] == 0
        assert data["total_amount"] == 0.0

    def test_employee_without_profile_cannot_create_expense(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.post(
            "/expense-tickets",
            headers=auth_headers(user),
            json={
                "title": "Orphan expense",
                "category": "supplies",
                "purchase_date": "2026-04-01",
                "amount": "25.50",
                "payment_source": "personal_money",
            },
        )

        assert resp.status_code == 404

    def test_employee_without_profile_cannot_read_unassigned_expense(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        user = make_user(db, company=company, email="u@test.com", role=UserRole.EMPLOYEE)
        ticket = ExpenseTicket(
            id=uuid.uuid4(),
            company_id=company.id,
            employee_id=None,
            created_by_user_id=admin.id,
            title="Unassigned",
            category=ExpenseCategory.SUPPLIES,
            purchase_date=date(2026, 4, 1),
            amount="25.50",
            currency="EUR",
            payment_source=PaymentSource.PERSONAL_MONEY,
            requires_reimbursement=False,
            status=ExpenseStatus.PENDING,
        )
        db.add(ticket)
        db.commit()

        resp = client.get(f"/expense-tickets/{ticket.id}", headers=auth_headers(user))

        assert resp.status_code == 403

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

    def test_update_purchase_date_cannot_be_future(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=admin)
        db.commit()

        resp = client.patch(
            f"/expense-tickets/{ticket.id}",
            headers=auth_headers(admin),
            json={"purchase_date": "2099-12-31"},
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


class TestExpenseAttachments:
    def test_upload_attachment_stores_private_object_key_and_replaces_old_object(self, client, db):
        storage = _override_storage(client)
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=admin)
        ticket.attachment_key = "companies/old/expense-tickets/2026/05/old.pdf"
        storage.objects[ticket.attachment_key] = (b"%PDF-old", "application/pdf")
        db.commit()

        resp = client.post(
            f"/expense-tickets/{ticket.id}/attachment",
            headers=auth_headers(admin),
            files={"file": ("../Mi ticket!!.png", b"\x89PNG\r\n\x1a\nimage-bytes", "image/png")},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["attachment_key"].startswith(f"companies/{company.id}/expense-tickets/")
        assert data["attachment_key"].endswith("_mi-ticket.png")
        assert data["attachment_file_name"] == "Mi ticket_.png"
        assert data["attachment_mime_type"] == "image/png"
        assert data["attachment_size"] == len(b"\x89PNG\r\n\x1a\nimage-bytes")
        assert "attachment_url" not in data
        assert data["attachment_key"] in storage.objects
        assert "companies/old/expense-tickets/2026/05/old.pdf" not in storage.objects

    def test_download_attachment_streams_after_authorization(self, client, db):
        storage = _override_storage(client)
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=admin)
        ticket.attachment_key = f"companies/{company.id}/expense-tickets/2026/05/receipt.pdf"
        ticket.attachment_file_name = "receipt.pdf"
        ticket.attachment_mime_type = "application/pdf"
        ticket.attachment_size = len(b"%PDF-private")
        storage.objects[ticket.attachment_key] = (b"%PDF-private", "application/pdf")
        db.commit()

        resp = client.get(f"/expense-tickets/{ticket.id}/attachment", headers=auth_headers(admin))

        assert resp.status_code == 200
        assert resp.content == b"%PDF-private"
        assert resp.headers["content-type"].startswith("application/pdf")
        assert "receipt.pdf" in resp.headers["content-disposition"]
        assert resp.headers["cache-control"] == "private, no-store"

    def test_download_attachment_rejects_employee_from_same_tenant_without_scope(self, client, db):
        storage = _override_storage(client)
        company = make_company(db)
        user_a = make_user(db, company=company, email="a@test.com", role=UserRole.EMPLOYEE)
        user_b = make_user(db, company=company, email="b@test.com", role=UserRole.EMPLOYEE)
        emp_a = make_employee(db, company=company, user=user_a)
        emp_b = make_employee(db, company=company, user=user_b)
        ticket = _make_expense(db, company=company, employee=emp_b, user=user_b)
        ticket.attachment_key = f"companies/{company.id}/expense-tickets/2026/05/secret.pdf"
        ticket.attachment_file_name = "secret.pdf"
        ticket.attachment_mime_type = "application/pdf"
        storage.objects[ticket.attachment_key] = (b"%PDF-secret", "application/pdf")
        db.commit()

        assert emp_a.id != emp_b.id
        resp = client.get(f"/expense-tickets/{ticket.id}/attachment", headers=auth_headers(user_a))

        assert resp.status_code == 403

    def test_delete_attachment_clears_metadata_and_deletes_object(self, client, db):
        storage = _override_storage(client)
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=admin)
        key = f"companies/{company.id}/expense-tickets/2026/05/receipt.pdf"
        ticket.attachment_key = key
        ticket.attachment_file_name = "receipt.pdf"
        ticket.attachment_mime_type = "application/pdf"
        ticket.attachment_size = 12
        storage.objects[key] = (b"%PDF-private", "application/pdf")
        db.commit()

        resp = client.delete(f"/expense-tickets/{ticket.id}/attachment", headers=auth_headers(admin))

        assert resp.status_code == 204
        assert key not in storage.objects
        db.refresh(ticket)
        assert ticket.attachment_key is None
        assert ticket.attachment_file_name is None

    def test_upload_attachment_rejects_mime_spoofing(self, client, db):
        _override_storage(client)
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        emp = make_employee(db, company=company)
        ticket = _make_expense(db, company=company, employee=emp, user=admin)
        db.commit()

        resp = client.post(
            f"/expense-tickets/{ticket.id}/attachment",
            headers=auth_headers(admin),
            files={"file": ("fake.png", b"not-a-png", "image/png")},
        )

        assert resp.status_code == 409


def _override_storage(client) -> "FakeStorage":
    from app.main import app

    storage = FakeStorage()
    app.dependency_overrides[get_storage_backend] = lambda: storage
    return storage


class FakeStorage:
    name = "fake"

    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str | None]] = {}

    def upload_file(self, key, content, *, content_type=None, metadata=None):
        self.objects[key] = (content, content_type)

    def download_file(self, key):
        if key not in self.objects:
            raise StorageNotFoundError("missing")
        content, content_type = self.objects[key]
        return StoredObject(body=BytesIO(content), content_type=content_type, content_length=len(content))

    def delete_file(self, key):
        self.objects.pop(key, None)

    def exists(self, key):
        return key in self.objects

    def generate_private_access(self, key, *, expires_in_seconds=300):
        return f"https://private.example/{key}?expires={expires_in_seconds}"
