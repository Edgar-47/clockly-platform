from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse

from app.core.security import hash_token
from app.models.enums import InvitationStatus, UserRole
from app.models.user_invitation import UserInvitation
from tests.conftest import auth_headers, make_company, make_user


def _token_from_acceptance_url(url: str) -> str:
    return urlparse(url).path.rsplit("/", 1)[-1]


class TestInvitations:
    def test_owner_invites_admin(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        db.commit()

        resp = client.post(
            f"/businesses/{company.id}/invitations",
            headers=auth_headers(owner),
            json={"email": "new-admin@test.com", "role": "admin"},
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "new-admin@test.com"
        assert data["role"] == "admin"
        assert data["status"] == "pending"
        assert "/accept-invitation/" in data["acceptance_url"]
        assert "token_hash" not in data

    def test_admin_invites_manager(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            f"/businesses/{company.id}/invitations",
            headers=auth_headers(admin),
            json={"email": "manager@test.com", "role": "manager"},
        )

        assert resp.status_code == 201

    def test_admin_cannot_invite_admin(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            f"/businesses/{company.id}/invitations",
            headers=auth_headers(admin),
            json={"email": "other-admin@test.com", "role": "admin"},
        )

        assert resp.status_code == 403

    def test_manager_cannot_invite_admin(self, client, db):
        company = make_company(db)
        manager = make_user(db, company=company, email="manager@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.post(
            f"/businesses/{company.id}/invitations",
            headers=auth_headers(manager),
            json={"email": "admin@test.com", "role": "admin"},
        )

        assert resp.status_code == 403

    def test_superadmin_cannot_be_invited(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        db.commit()

        resp = client.post(
            f"/businesses/{company.id}/invitations",
            headers=auth_headers(owner),
            json={"email": "root@test.com", "role": "superadmin"},
        )

        assert resp.status_code == 422

    def test_duplicate_pending_invitation_rejected(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        db.commit()

        payload = {"email": "dup@test.com", "role": "employee"}
        first = client.post(f"/businesses/{company.id}/invitations", headers=auth_headers(owner), json=payload)
        second = client.post(f"/businesses/{company.id}/invitations", headers=auth_headers(owner), json=payload)

        assert first.status_code == 201
        assert second.status_code == 409

    def test_revoke_pending_invitation(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        db.commit()

        created = client.post(
            f"/businesses/{company.id}/invitations",
            headers=auth_headers(owner),
            json={"email": "pending@test.com", "role": "employee"},
        )
        invitation_id = created.json()["id"]

        resp = client.delete(
            f"/businesses/{company.id}/invitations/{invitation_id}",
            headers=auth_headers(owner),
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == "revoked"

    def test_accept_invitation_creates_user_and_prevents_reuse(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        db.commit()

        created = client.post(
            f"/businesses/{company.id}/invitations",
            headers=auth_headers(owner),
            json={"email": "employee@test.com", "role": "employee"},
        )
        token = _token_from_acceptance_url(created.json()["acceptance_url"])

        accepted = client.post(
            f"/invitations/{token}/accept",
            json={"full_name": "Employee User", "password": "accepted-pass-123"},
        )
        reused = client.post(
            f"/invitations/{token}/accept",
            json={"full_name": "Employee User", "password": "accepted-pass-123"},
        )

        assert accepted.status_code == 200
        assert accepted.json()["invitation"]["status"] == "accepted"
        assert reused.status_code == 409

        login = client.post(
            "/auth/login",
            json={"email": "employee@test.com", "password": "accepted-pass-123"},
        )
        assert login.status_code == 200
        assert login.json()["user"]["role"] == "employee"

    def test_expired_invitation_fails(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        invitation = UserInvitation(
            company_id=company.id,
            email="expired@test.com",
            role=UserRole.EMPLOYEE,
            invited_by_user_id=owner.id,
            token_hash=hash_token("expired-token"),
            status=InvitationStatus.PENDING,
            expires_at=datetime.now(UTC) - timedelta(days=1),
        )
        db.add(invitation)
        db.commit()

        resp = client.post(
            "/invitations/expired-token/accept",
            json={"full_name": "Expired User", "password": "expired-pass-123"},
        )

        assert resp.status_code == 409


class TestMemberManagement:
    def test_owner_changes_admin_to_manager(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            f"/businesses/{company.id}/members/{admin.id}/role",
            headers=auth_headers(owner),
            json={"role": "manager"},
        )

        assert resp.status_code == 200
        assert resp.json()["role"] == "manager"

    def test_admin_cannot_change_admin_role(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        other_admin = make_user(db, company=company, email="other-admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            f"/businesses/{company.id}/members/{other_admin.id}/role",
            headers=auth_headers(admin),
            json={"role": "manager"},
        )

        assert resp.status_code == 403

    def test_member_cannot_change_own_role(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        db.commit()

        resp = client.post(
            f"/businesses/{company.id}/members/{owner.id}/role",
            headers=auth_headers(owner),
            json={"role": "admin"},
        )

        assert resp.status_code == 403

    def test_owner_revokes_manager_access(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        manager = make_user(db, company=company, email="manager@test.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.delete(
            f"/businesses/{company.id}/members/{manager.id}",
            headers=auth_headers(owner),
        )

        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_owner_cannot_revoke_last_owner(self, client, db):
        company = make_company(db)
        owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
        db.commit()

        resp = client.delete(
            f"/businesses/{company.id}/members/{owner.id}",
            headers=auth_headers(owner),
        )

        assert resp.status_code == 403

    def test_cannot_modify_other_business_member(self, client, db):
        company_a = make_company(db, slug="company-a")
        company_b = make_company(db, slug="company-b")
        owner_a = make_user(db, company=company_a, email="owner@a.com", role=UserRole.OWNER)
        manager_b = make_user(db, company=company_b, email="manager@b.com", role=UserRole.MANAGER)
        db.commit()

        resp = client.post(
            f"/businesses/{company_a.id}/members/{manager_b.id}/role",
            headers=auth_headers(owner_a),
            json={"role": "employee"},
        )

        assert resp.status_code == 404
