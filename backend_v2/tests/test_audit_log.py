from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from tests.conftest import auth_headers, make_company, make_user


def test_failed_login_writes_audit_log(client, db):
    company = make_company(db)
    user = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
    db.commit()

    response = client.post("/auth/login", json={"identifier": user.email, "password": "wrong"})

    assert response.status_code == 401
    entry = db.query(AuditLog).filter_by(action="auth.login_failed").one()
    assert entry.company_id == company.id
    assert entry.actor_user_id == user.id


def test_invitation_create_writes_audit_log(client, db):
    company = make_company(db)
    owner = make_user(db, company=company, email="owner@test.com", role=UserRole.OWNER)
    db.commit()

    response = client.post(
        f"/businesses/{company.id}/invitations",
        headers=auth_headers(owner),
        json={"email": "new-user@test.com", "role": "employee"},
    )

    assert response.status_code == 201
    entry = db.query(AuditLog).filter_by(action="invitation.created").one()
    assert entry.company_id == company.id
    assert entry.actor_user_id == owner.id
    assert entry.metadata_json["email"] == "new-user@test.com"
