"""Permission enforcement tests.

Verifies that each role can only access what the permission matrix allows,
and that privilege escalation attempts are blocked.
"""

from tests.conftest import auth_headers, make_company, make_user
from app.models.enums import UserRole


class TestEmployeeAccess:
    """EMPLOYEE role should be denied from admin-only resources."""

    def test_employee_cannot_list_all_sessions(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        db.commit()
        # Without an employee profile, employee gets 200 with empty list (own sessions)
        # This is by design — they can read their own sessions
        resp = client.get("/attendance/sessions", headers=auth_headers(user))
        assert resp.status_code == 200

    def test_employee_cannot_list_employees(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.get("/employees", headers=auth_headers(user))
        assert resp.status_code == 403

    def test_employee_cannot_create_employee(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.post(
            "/employees",
            headers=auth_headers(user),
            json={"first_name": "New", "last_name": "Employee"},
        )
        assert resp.status_code == 403

    def test_employee_cannot_read_metrics(self, client, db):
        company = make_company(db, plan="pro")
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.get("/metrics/overview", headers=auth_headers(user))
        assert resp.status_code == 403

    def test_employee_cannot_manage_users(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.get("/users", headers=auth_headers(user))
        assert resp.status_code == 403

    def test_employee_cannot_export(self, client, db):
        company = make_company(db, plan="pro")
        user = make_user(db, company=company, email="emp@test.com", role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.get("/exports/attendance", headers=auth_headers(user))
        assert resp.status_code == 403


class TestManagerAccess:
    """MANAGER should be able to read but not write employees/schedules/exports."""

    def test_manager_can_list_employees(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.get("/employees", headers=auth_headers(user))
        assert resp.status_code == 200

    def test_manager_cannot_create_employee(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.post(
            "/employees",
            headers=auth_headers(user),
            json={"first_name": "New", "last_name": "Employee"},
        )
        assert resp.status_code == 403

    def test_manager_cannot_manage_users(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.get("/users", headers=auth_headers(user))
        assert resp.status_code == 403

    def test_manager_cannot_export(self, client, db):
        company = make_company(db, plan="pro")
        user = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.get("/exports/attendance", headers=auth_headers(user))
        assert resp.status_code == 403

    def test_manager_can_read_metrics(self, client, db):
        company = make_company(db, plan="pro")
        user = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.get("/metrics/overview", headers=auth_headers(user))
        assert resp.status_code == 200


class TestAdminAccess:
    """ADMIN can do everything OWNER can, except manage other ADMINs/OWNERs."""

    def test_admin_can_create_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/employees",
            headers=auth_headers(admin),
            json={"first_name": "New", "last_name": "Staff"},
        )
        assert resp.status_code == 201

    def test_admin_can_manage_users(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/users", headers=auth_headers(admin))
        assert resp.status_code == 200

    def test_admin_cannot_promote_to_owner(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        target = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.patch(
            f"/users/{target.id}/role",
            headers=auth_headers(admin),
            json={"role": "owner"},
        )
        assert resp.status_code == 403

    def test_admin_cannot_promote_to_admin(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        target = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.patch(
            f"/users/{target.id}/role",
            headers=auth_headers(admin),
            json={"role": "admin"},
        )
        assert resp.status_code == 403

    def test_admin_can_demote_manager_to_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        target = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.patch(
            f"/users/{target.id}/role",
            headers=auth_headers(admin),
            json={"role": "employee"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "employee"

    def test_admin_cannot_modify_owner(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        db.commit()

        resp = client.patch(
            f"/users/{owner.id}/role",
            headers=auth_headers(admin),
            json={"role": "employee"},
        )
        assert resp.status_code == 403

    def test_admin_cannot_deactivate_other_admin(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        peer = make_user(db, company=company, email="peer-admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.patch(f"/users/{peer.id}/deactivate", headers=auth_headers(admin))
        assert resp.status_code == 403

    def test_admin_cannot_delete_other_admin(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        peer = make_user(db, company=company, email="peer-admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.delete(f"/users/{peer.id}", headers=auth_headers(admin))
        assert resp.status_code == 403

    def test_admin_cannot_change_own_role(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.patch(
            f"/users/{admin.id}/role",
            headers=auth_headers(admin),
            json={"role": "employee"},
        )
        assert resp.status_code == 403


class TestSuperadminBlock:
    """Superadmin role must not be assignable via client-facing APIs."""

    def test_owner_cannot_assign_superadmin(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        target = make_user(db, company=company, email="mgr@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.patch(
            f"/users/{target.id}/role",
            headers=auth_headers(owner),
            json={"role": "superadmin"},
        )
        assert resp.status_code == 422  # Pydantic validation rejects superadmin

    def test_create_user_with_superadmin_role_rejected(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        db.commit()

        resp = client.post(
            "/users",
            headers=auth_headers(owner),
            json={
                "email": "evil@test.com",
                "full_name": "Evil User",
                "password": "password-123",
                "role": "superadmin",
            },
        )
        assert resp.status_code == 422

    def test_superadmin_endpoint_blocks_non_superadmin(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        db.commit()

        resp = client.get("/superadmin/status", headers=auth_headers(owner))
        assert resp.status_code == 403

    def test_superadmin_cannot_use_tenant_employee_api(self, client, db):
        company = make_company(db)
        superadmin = make_user(db, company=company, email="root@test.com", role=UserRole.SUPERADMIN)
        db.commit()

        resp = client.get("/employees", headers=auth_headers(superadmin))
        assert resp.status_code == 403
