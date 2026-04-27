"""Auth endpoint tests: login, refresh, logout, token security."""

from tests.conftest import auth_headers, make_company, make_user
from app.models.enums import UserRole


class TestLogin:
    def test_login_valid_credentials(self, client, db):
        company = make_company(db)
        make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER, password="my-secure-pass-1")
        db.commit()

        resp = client.post("/auth/login", json={"email": "owner@test.com", "password": "my-secure-pass-1"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["company"]["id"] is not None
        assert data["user"]["role"] == "owner"

    def test_login_wrong_password(self, client, db):
        company = make_company(db)
        make_user(db, company=company, email="user@test.com", password="correct-pass-123")
        db.commit()

        resp = client.post("/auth/login", json={"email": "user@test.com", "password": "wrong"})
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "unauthorized"

    def test_login_unknown_email(self, client, db):
        resp = client.post("/auth/login", json={"email": "nobody@test.com", "password": "anything"})
        assert resp.status_code == 401

    def test_login_inactive_user_rejected(self, client, db):
        company = make_company(db)
        make_user(db, company=company, email="inactive@test.com", password="pass-123-xyz", is_active=False)
        db.commit()

        resp = client.post("/auth/login", json={"email": "inactive@test.com", "password": "pass-123-xyz"})
        assert resp.status_code == 401

    def test_login_email_case_insensitive(self, client, db):
        company = make_company(db)
        make_user(db, company=company, email="user@test.com", password="pass-123-xyz")
        db.commit()

        resp = client.post("/auth/login", json={"email": "USER@TEST.COM", "password": "pass-123-xyz"})
        assert resp.status_code == 200

    def test_login_missing_fields(self, client, db):
        resp = client.post("/auth/login", json={"email": "user@test.com"})
        assert resp.status_code == 422


class TestMe:
    def test_me_authenticated(self, client, db):
        company = make_company(db)
        user = make_user(db, company=company, email="me@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/auth/me", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["email"] == "me@test.com"
        assert data["user"]["role"] == "admin"
        assert "permissions" in data

    def test_me_unauthenticated(self, client, db):
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_me_invalid_token(self, client, db):
        resp = client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401


class TestLogout:
    def test_logout_clears_session(self, client, db):
        company = make_company(db)
        make_user(db, company=company, email="user@test.com", password="pass-test-123")
        db.commit()

        login = client.post("/auth/login", json={"email": "user@test.com", "password": "pass-test-123"})
        assert login.status_code == 200

        logout = client.post("/auth/logout")
        assert logout.status_code == 200

    def test_logout_without_session_is_safe(self, client, db):
        resp = client.post("/auth/logout")
        assert resp.status_code == 200


class TestRefresh:
    def test_refresh_with_valid_token(self, client, db):
        company = make_company(db)
        make_user(db, company=company, email="user@test.com", password="pass-test-abc")
        db.commit()

        login = client.post("/auth/login", json={"email": "user@test.com", "password": "pass-test-abc"})
        assert login.status_code == 200
        old_refresh = login.json()["refresh_token"]

        refresh = client.post("/auth/refresh", json={"refresh_token": old_refresh})
        assert refresh.status_code == 200
        new_data = refresh.json()
        assert "access_token" in new_data
        assert new_data["refresh_token"] != old_refresh  # token rotation

    def test_refresh_with_invalid_token(self, client, db):
        # Must be >= 32 chars to pass schema validation; then fails in service
        fake = "a" * 50
        resp = client.post("/auth/refresh", json={"refresh_token": fake})
        assert resp.status_code == 401

    def test_refresh_token_rotation_revokes_old(self, client, db):
        company = make_company(db)
        make_user(db, company=company, email="user@test.com", password="pass-test-xyz")
        db.commit()

        login = client.post("/auth/login", json={"email": "user@test.com", "password": "pass-test-xyz"})
        old_refresh = login.json()["refresh_token"]

        client.post("/auth/refresh", json={"refresh_token": old_refresh})

        # Using the old token again should fail
        retry = client.post("/auth/refresh", json={"refresh_token": old_refresh})
        assert retry.status_code == 401
