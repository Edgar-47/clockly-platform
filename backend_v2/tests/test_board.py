"""Board endpoint tests.

Covers management-role access, employee denial, tenant isolation, note
lifecycle, label uniqueness, and cross-tenant label validation.
"""
from __future__ import annotations

import uuid

from app.models.board import BoardLabel, BoardNote
from app.models.enums import BoardNotePriority, BoardNoteStatus, UserRole
from tests.conftest import auth_headers, make_company, make_user


def _create_label(db, *, company, user, name="Recordatorio", color="blue"):
    label = BoardLabel(
        id=uuid.uuid4(),
        company_id=company.id,
        name=name,
        color=color,
        created_by_user_id=user.id,
    )
    db.add(label)
    db.flush()
    return label


def _create_note(
    db,
    *,
    company,
    user,
    title="Nota operativa",
    status=BoardNoteStatus.PENDING,
    priority=BoardNotePriority.MEDIUM,
):
    note = BoardNote(
        id=uuid.uuid4(),
        company_id=company.id,
        title=title,
        status=status,
        priority=priority,
        created_by_user_id=user.id,
    )
    db.add(note)
    db.flush()
    return note


class TestBoardAccess:
    def test_management_roles_can_access_board(self, client, db):
        for role in (UserRole.OWNER, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER):
            company = make_company(db, slug=f"company-{role.value}")
            user = make_user(db, company=company, email=f"{role.value}@test.com", role=role)
            db.commit()

            resp = client.get("/board/notes", headers=auth_headers(user))

            assert resp.status_code == 200

    def test_employee_cannot_access_board(self, client, db):
        company = make_company(db)
        employee = make_user(db, company=company, email="employee@test.com", role=UserRole.EMPLOYEE)
        db.commit()

        list_resp = client.get("/board/notes", headers=auth_headers(employee))
        create_resp = client.post(
            "/board/notes",
            headers=auth_headers(employee),
            json={"title": "Nope"},
        )

        assert list_resp.status_code == 403
        assert create_resp.status_code == 403


class TestBoardNotes:
    def test_create_note(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        label = _create_label(db, company=company, user=admin)
        db.commit()

        resp = client.post(
            "/board/notes",
            headers=auth_headers(admin),
            json={
                "title": "Preparar turnos de manana",
                "content": "Revisar bajas y confirmaciones antes de las 18:00.",
                "priority": "high",
                "label_ids": [str(label.id)],
            },
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Preparar turnos de manana"
        assert data["priority"] == "high"
        assert data["author"]["id"] == str(admin.id)
        assert data["labels"][0]["id"] == str(label.id)

    def test_list_notes_only_current_company(self, client, db):
        co_a = make_company(db, slug="co-a")
        co_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=co_b, email="admin@b.com", role=UserRole.ADMIN)
        _create_note(db, company=co_a, user=admin_a, title="Nota A")
        _create_note(db, company=co_b, user=admin_b, title="Nota B")
        db.commit()

        resp = client.get("/board/notes", headers=auth_headers(admin_a))

        assert resp.status_code == 200
        titles = [item["title"] for item in resp.json()["items"]]
        assert "Nota A" in titles
        assert "Nota B" not in titles

    def test_update_note(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        note = _create_note(db, company=company, user=admin)
        db.commit()

        resp = client.patch(
            f"/board/notes/{note.id}",
            headers=auth_headers(admin),
            json={"title": "Nota actualizada", "status": "in_progress", "priority": "urgent"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Nota actualizada"
        assert data["status"] == "in_progress"
        assert data["priority"] == "urgent"

    def test_complete_note(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        note = _create_note(db, company=company, user=admin)
        db.commit()

        resp = client.patch(f"/board/notes/{note.id}/complete", headers=auth_headers(admin))

        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"
        assert resp.json()["completed_at"] is not None

    def test_archive_note(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        note = _create_note(db, company=company, user=admin)
        db.commit()

        resp = client.patch(f"/board/notes/{note.id}/archive", headers=auth_headers(admin))

        assert resp.status_code == 200
        assert resp.json()["status"] == "archived"
        assert resp.json()["archived_at"] is not None

    def test_delete_note(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        note = _create_note(db, company=company, user=admin)
        db.commit()

        delete_resp = client.delete(f"/board/notes/{note.id}", headers=auth_headers(admin))
        get_resp = client.get(f"/board/notes/{note.id}", headers=auth_headers(admin))

        assert delete_resp.status_code == 204
        assert get_resp.status_code == 404


class TestBoardLabels:
    def test_create_label(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/board/labels",
            headers=auth_headers(admin),
            json={"name": "Operacion diaria", "color": "green", "description": "Notas del dia"},
        )

        assert resp.status_code == 201
        assert resp.json()["name"] == "Operacion diaria"

    def test_duplicate_label_name_rejected_in_same_company(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        _create_label(db, company=company, user=admin, name="Importante", color="purple")
        db.commit()

        resp = client.post(
            "/board/labels",
            headers=auth_headers(admin),
            json={"name": "importante", "color": "red"},
        )

        assert resp.status_code == 409

    def test_same_label_name_allowed_in_different_companies(self, client, db):
        co_a = make_company(db, slug="co-a")
        co_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=co_b, email="admin@b.com", role=UserRole.ADMIN)
        _create_label(db, company=co_a, user=admin_a, name="Importante", color="purple")
        db.commit()

        resp = client.post(
            "/board/labels",
            headers=auth_headers(admin_b),
            json={"name": "Importante", "color": "red"},
        )

        assert resp.status_code == 201

    def test_label_in_use_cannot_be_deleted(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, email="admin@test.com", role=UserRole.ADMIN)
        label = _create_label(db, company=company, user=admin, name="Incidencia", color="red")
        note = _create_note(db, company=company, user=admin)
        note.labels = [label]
        db.commit()

        resp = client.delete(f"/board/labels/{label.id}", headers=auth_headers(admin))

        assert resp.status_code == 409


class TestBoardCrossTenant:
    def test_cannot_use_label_from_other_tenant(self, client, db):
        co_a = make_company(db, slug="co-a")
        co_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=co_b, email="admin@b.com", role=UserRole.ADMIN)
        label_b = _create_label(db, company=co_b, user=admin_b, name="Secreto", color="gray")
        db.commit()

        resp = client.post(
            "/board/notes",
            headers=auth_headers(admin_a),
            json={"title": "Intento cross tenant", "label_ids": [str(label_b.id)]},
        )

        assert resp.status_code == 404

    def test_cannot_access_or_modify_note_from_other_tenant(self, client, db):
        co_a = make_company(db, slug="co-a")
        co_b = make_company(db, slug="co-b")
        admin_a = make_user(db, company=co_a, email="admin@a.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=co_b, email="admin@b.com", role=UserRole.ADMIN)
        note_b = _create_note(db, company=co_b, user=admin_b, title="Privada B")
        db.commit()

        get_resp = client.get(f"/board/notes/{note_b.id}", headers=auth_headers(admin_a))
        patch_resp = client.patch(
            f"/board/notes/{note_b.id}",
            headers=auth_headers(admin_a),
            json={"title": "Exploit"},
        )

        assert get_resp.status_code == 404
        assert patch_resp.status_code == 404
