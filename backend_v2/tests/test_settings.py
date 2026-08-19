from tests.conftest import auth_headers, make_company, make_user
from app.models.enums import UserRole


def test_blank_company_name_is_rejected(client, db):
    company = make_company(db)
    admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
    db.commit()

    resp = client.patch(
        "/settings/company",
        headers=auth_headers(admin),
        json={"name": "   "},
    )

    assert resp.status_code == 422
