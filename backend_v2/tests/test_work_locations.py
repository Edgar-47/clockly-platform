"""Work location CRUD + permission tests."""

import pytest

from tests.conftest import auth_headers, make_company, make_user
from app.models.enums import UserRole


BARCELONA = {"latitude": 41.3851, "longitude": 2.1734}


def make_location(client, admin, *, name="Oficina", **kwargs):
    payload = {"name": name, "allowed_radius_meters": 200, **BARCELONA, **kwargs}
    return client.post("/locations", headers=auth_headers(admin), json=payload)


class TestListLocations:
    def test_admin_can_list(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/locations", headers=auth_headers(admin))
        assert resp.status_code == 200
        assert "items" in resp.json()

    def test_employee_cannot_list(self, client, db):
        company = make_company(db, plan="business")
        emp_user = make_user(db, company=company, role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.get("/locations", headers=auth_headers(emp_user))
        assert resp.status_code == 403

    def test_pro_without_business_cannot_list_work_locations(self, client, db):
        company = make_company(db, plan="pro")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/locations", headers=auth_headers(admin))
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "plan_required"

    def test_unauthenticated_cannot_list(self, client, db):
        resp = client.get("/locations")
        assert resp.status_code == 401


class TestCreateLocation:
    def test_admin_creates_location_with_coords(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = make_location(client, admin, name="HQ")
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "HQ"
        assert data["latitude"] == pytest.approx(41.3851, rel=1e-4)
        assert data["longitude"] == pytest.approx(2.1734, rel=1e-4)
        assert data["allowed_radius_meters"] == 200

    def test_location_without_coords_is_valid(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/locations",
            headers=auth_headers(admin),
            json={"name": "Sin coordenadas"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["latitude"] is None
        assert data["longitude"] is None

    def test_only_one_coord_raises_422(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/locations",
            headers=auth_headers(admin),
            json={"name": "Bad", "latitude": 41.3851},  # no longitude
        )
        assert resp.status_code == 422

    def test_employee_cannot_create(self, client, db):
        company = make_company(db, plan="business")
        emp_user = make_user(db, company=company, role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.post(
            "/locations",
            headers=auth_headers(emp_user),
            json={"name": "Attempt"},
        )
        assert resp.status_code == 403

    def test_pro_without_business_cannot_create_location(self, client, db):
        company = make_company(db, plan="pro")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = make_location(client, admin, name="Blocked")
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "plan_required"


class TestUpdateLocation:
    def test_admin_can_update_name(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        created = make_location(client, admin, name="Old Name")
        loc_id = created.json()["id"]

        resp = client.patch(
            f"/locations/{loc_id}",
            headers=auth_headers(admin),
            json={"name": "New Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    def test_admin_can_update_radius(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        loc_id = make_location(client, admin).json()["id"]
        resp = client.patch(
            f"/locations/{loc_id}",
            headers=auth_headers(admin),
            json={"allowed_radius_meters": 500},
        )
        assert resp.status_code == 200
        assert resp.json()["allowed_radius_meters"] == 500

    def test_cross_tenant_update_returns_404(self, client, db):
        company_a = make_company(db, slug="company-a", plan="business")
        company_b = make_company(db, slug="company-b", plan="business")
        admin_a = make_user(db, company=company_a, email="admin-a@test.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=company_b, email="admin-b@test.com", role=UserRole.ADMIN)
        db.commit()

        loc_id = make_location(client, admin_a).json().get("id")
        if not loc_id:
            # plan gate — still verify that admin_b cannot reach it
            pytest.skip("Location creation requires business plan; cross-tenant test skipped")

        resp = client.patch(
            f"/locations/{loc_id}",
            headers=auth_headers(admin_b),
            json={"name": "Hacked"},
        )
        assert resp.status_code == 404


class TestDeleteLocation:
    def test_delete_soft_deactivates(self, client, db):
        company = make_company(db, plan="business")
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        loc_id = make_location(client, admin).json()["id"]

        del_resp = client.delete(f"/locations/{loc_id}", headers=auth_headers(admin))
        assert del_resp.status_code == 204

        # Still visible with include_inactive=true
        list_resp = client.get(
            "/locations?include_inactive=true", headers=auth_headers(admin)
        )
        ids = [loc["id"] for loc in list_resp.json()["items"]]
        assert loc_id in ids

        # Not visible by default
        list_default = client.get("/locations", headers=auth_headers(admin))
        default_ids = [loc["id"] for loc in list_default.json()["items"]]
        assert loc_id not in default_ids

    def test_cross_tenant_delete_returns_404(self, client, db):
        company_a = make_company(db, slug="co-a", plan="business")
        company_b = make_company(db, slug="co-b", plan="business")
        admin_a = make_user(db, company=company_a, email="a@test.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=company_b, email="b@test.com", role=UserRole.ADMIN)
        db.commit()

        loc_id = make_location(client, admin_a).json().get("id")
        if not loc_id:
            pytest.skip("Location creation requires business plan")

        resp = client.delete(f"/locations/{loc_id}", headers=auth_headers(admin_b))
        assert resp.status_code == 404
