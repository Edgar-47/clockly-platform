from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from app.models.cash_closure import CashClosure, CashClosureCardTerminal, CashClosureDrawer
from app.models.company_location import CompanyLocation
from app.models.enums import CashClosureShift, UserRole
from tests.conftest import auth_headers, make_company, make_user


def _payload(**overrides):
    data = {
        "date": "2026-04-29",
        "shift": "morning",
        "theoretical_total": "150.00",
        "real_total": "160.00",
        "notes": "Cierre turno manana",
        "cash_drawers": [
            {"name": "Cajon 1", "amount": "110.00"},
        ],
        "card_terminals": [
            {"name": "TPV Barra", "amount": "50.00"},
        ],
        "incidence_comment": "Sobran 10 euros por propinas no retiradas.",
    }
    data.update(overrides)
    return data


def _make_location(db, *, company, name="Centro"):
    location = CompanyLocation(
        id=uuid.uuid4(),
        company_id=company.id,
        name=name,
        timezone="UTC",
        is_active=True,
    )
    db.add(location)
    db.flush()
    return location


def _make_closure(db, *, company, user, closure_date=date(2026, 4, 29), balance="0.00"):
    closure = CashClosure(
        id=uuid.uuid4(),
        company_id=company.id,
        closed_by_user_id=user.id,
        date=closure_date,
        shift=CashClosureShift.MORNING,
        theoretical_total="100.00",
        real_total=str(100 + float(balance)),
        balance=balance,
        has_incidence=balance != "0.00",
        incidence_amount=balance,
        incidence_comment="Descuadre revisado" if balance != "0.00" else None,
        signature_name=user.full_name,
        signed_at=datetime(2026, 4, 29, 12, 0, tzinfo=UTC),
        locked_at=datetime(2026, 4, 29, 12, 0, tzinfo=UTC),
    )
    closure.cash_drawers = [
        CashClosureDrawer(
            id=uuid.uuid4(),
            name="Cajon 1",
            theoretical_amount="0.00",
            real_amount=str(100 + float(balance)),
            sort_order=0,
        )
    ]
    closure.card_terminals = [
        CashClosureCardTerminal(
            id=uuid.uuid4(),
            name="TPV 1",
            theoretical_amount="0.00",
            real_amount="0.00",
            sort_order=0,
        )
    ]
    db.add(closure)
    db.flush()
    return closure


class TestCashClosureCreate:
    def test_manager_can_create_and_backend_calculates_global_totals(self, client, db):
        company = make_company(db)
        manager = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.post("/cash-closures", headers=auth_headers(manager), json=_payload())

        assert resp.status_code == 201
        data = resp.json()
        assert data["theoretical_total"] == "150.00"
        assert data["real_total"] == "160.00"
        assert data["balance"] == "10.00"
        assert data["has_incidence"] is True
        assert data["incidence_amount"] == "10.00"
        assert data["closed_by_user_id"] == str(manager.id)
        assert data["signature_name"] == manager.full_name
        assert data["locked_at"] is not None
        assert data["cash_drawers"][0]["amount"] == "110.00"

    def test_balanced_closure_does_not_require_incidence_comment(self, client, db):
        company = make_company(db)
        manager = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        payload = _payload(
            theoretical_total="100.00",
            real_total="100.00",
            cash_drawers=[
                {"name": "Cajon 1", "amount": "100.00"},
            ],
            card_terminals=[],
            incidence_comment=None,
        )
        db.commit()

        resp = client.post("/cash-closures", headers=auth_headers(manager), json=payload)

        assert resp.status_code == 201
        assert resp.json()["has_incidence"] is False
        assert resp.json()["balance"] == "0.00"

    def test_incidence_requires_comment(self, client, db):
        company = make_company(db)
        manager = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        payload = _payload(incidence_comment=None)
        db.commit()

        resp = client.post("/cash-closures", headers=auth_headers(manager), json=payload)

        assert resp.status_code == 422

    def test_employee_cannot_create_cash_closure(self, client, db):
        company = make_company(db)
        employee = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.post("/cash-closures", headers=auth_headers(employee), json=_payload())

        assert resp.status_code == 403

    def test_location_must_belong_to_tenant(self, client, db):
        company_a = make_company(db, slug="a")
        company_b = make_company(db, slug="b")
        manager_a = make_user(db, company=company_a, email="mgr@a.com", role=UserRole.MANAGER)
        location_b = _make_location(db, company=company_b)
        db.commit()

        resp = client.post(
            "/cash-closures",
            headers=auth_headers(manager_a),
            json=_payload(location_id=str(location_b.id)),
        )

        assert resp.status_code == 404


class TestCashClosureReadAndScope:
    def test_list_is_tenant_scoped(self, client, db):
        company_a = make_company(db, slug="a")
        company_b = make_company(db, slug="b")
        admin_a = make_user(db, company=company_a, email="admin@a.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=company_b, email="admin@b.com", role=UserRole.ADMIN)
        _make_closure(db, company=company_b, user=admin_b)
        db.commit()

        resp = client.get("/cash-closures", headers=auth_headers(admin_a))

        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_filter_by_incidence(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        _make_closure(db, company=company, user=admin, balance="0.00")
        _make_closure(db, company=company, user=admin, balance="-5.00")
        db.commit()

        resp = client.get("/cash-closures?has_incidence=true", headers=auth_headers(admin))

        assert resp.status_code == 200
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["balance"] == "-5.00"


class TestCashClosureAnalyticsAndExport:
    def test_admin_stats_and_charts(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        _make_closure(db, company=company, user=admin, balance="0.00")
        _make_closure(db, company=company, user=admin, balance="10.00")
        db.commit()

        stats = client.get("/cash-closures/stats", headers=auth_headers(admin))
        charts = client.get("/cash-closures/charts?period=day", headers=auth_headers(admin))

        assert stats.status_code == 200
        assert stats.json()["closure_count"] == 2
        assert stats.json()["incidence_count"] == 1
        assert charts.status_code == 200
        assert len(charts.json()["revenue_by_period"]) == 1
        assert charts.json()["top_incidence_users"][0]["incidence_count"] == 1

    def test_manager_cannot_export_or_see_analytics(self, client, db):
        company = make_company(db)
        manager = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        stats = client.get("/cash-closures/stats", headers=auth_headers(manager))
        export = client.get("/cash-closures/export?format=csv", headers=auth_headers(manager))

        assert stats.status_code == 403
        assert export.status_code == 403

    def test_owner_can_export_csv(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        _make_closure(db, company=company, user=owner)
        db.commit()

        resp = client.get("/cash-closures/export?format=csv", headers=auth_headers(owner))

        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        assert "Fecha" in resp.text

    def test_owner_can_export_xlsx(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner2@test.com", role=UserRole.OWNER)
        _make_closure(db, company=company, user=owner)
        db.commit()

        resp = client.get("/cash-closures/export?format=xlsx", headers=auth_headers(owner))

        assert resp.status_code == 200
        assert "spreadsheetml" in resp.headers["content-type"]
        assert resp.content.startswith(b"PK")


class TestCashClosureEditHistory:
    def test_admin_can_edit_locked_closure_and_recomputes(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        closure = _make_closure(db, company=company, user=admin)
        db.commit()

        resp = client.patch(
            f"/cash-closures/{closure.id}",
            headers=auth_headers(admin),
            json={
                "theoretical_total": "100.00",
                "real_total": "90.00",
                "cash_drawers": [
                    {"name": "Cajon 1", "amount": "90.00"},
                ],
                "incidence_comment": "Faltan 10 euros tras arqueo.",
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["balance"] == "-10.00"
        assert data["last_edited_by_user_id"] == str(admin.id)

    def test_manager_cannot_edit_history(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        manager = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        closure = _make_closure(db, company=company, user=admin)
        db.commit()

        resp = client.patch(
            f"/cash-closures/{closure.id}",
            headers=auth_headers(manager),
            json={"notes": "Cambio"},
        )

        assert resp.status_code == 403
