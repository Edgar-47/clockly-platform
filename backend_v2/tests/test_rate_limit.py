from tests.conftest import make_company, make_user


def test_login_rate_limit_blocks_bruteforce_by_ip_and_identifier(client, db):
    company = make_company(db)
    make_user(db, company=company, email="target@test.com", password="correct-password")
    db.commit()

    for _ in range(5):
        response = client.post(
            "/auth/login",
            json={"email": "target@test.com", "password": "wrong-password"},
        )
        assert response.status_code == 401

    blocked = client.post(
        "/auth/login",
        json={"email": "target@test.com", "password": "wrong-password"},
    )
    assert blocked.status_code == 429
    assert blocked.headers["Retry-After"] == "60"
    assert blocked.headers["X-RateLimit-Limit"] == "5"
