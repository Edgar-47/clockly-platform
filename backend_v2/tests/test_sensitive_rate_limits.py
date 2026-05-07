from app.models.enums import UserRole
from tests.conftest import auth_headers, make_company, make_user


def test_exports_are_rate_limited_per_authenticated_user(client, db):
    company = make_company(db, plan="pro")
    admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
    db.commit()

    headers = auth_headers(admin)
    for _ in range(20):
        response = client.get("/exports/attendance?format=csv", headers=headers)
        assert response.status_code == 200

    limited = client.get("/exports/attendance?format=csv", headers=headers)

    assert limited.status_code == 429
    assert limited.headers["X-RateLimit-Limit"] == "20"


def test_gdpr_exports_are_rate_limited_per_authenticated_user(client, db):
    company = make_company(db, plan="pro")
    employee = make_user(db, company=company, email="employee@test.com", role=UserRole.EMPLOYEE)
    db.commit()

    headers = auth_headers(employee)
    for _ in range(10):
        response = client.get("/gdpr/me/export", headers=headers)
        assert response.status_code == 200

    limited = client.get("/gdpr/me/export", headers=headers)

    assert limited.status_code == 429
    assert limited.headers["X-RateLimit-Limit"] == "10"


def test_domain_exports_share_sensitive_export_rate_limit(client, db):
    company = make_company(db, plan="pro")
    admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
    db.commit()

    headers = auth_headers(admin)
    for _ in range(20):
        response = client.get("/late-arrivals/export?format=xlsx", headers=headers)
        assert response.status_code == 200

    limited = client.get("/expense-tickets/export?format=xlsx", headers=headers)

    assert limited.status_code == 429
    assert limited.headers["X-RateLimit-Limit"] == "20"
