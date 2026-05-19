"""Tests for employee schedule management — all 4 schedule types + late arrival integration."""

import pytest
from datetime import datetime, time
from zoneinfo import ZoneInfo
from unittest.mock import patch

from tests.conftest import auth_headers, make_company, make_user
from app.models.enums import UserRole, ScheduleType
from app.models.schedule import Schedule
from app.models.schedule_rule import ScheduleRule


UTC = ZoneInfo("UTC")


def make_schedule(client, admin, *, schedule_type="fixed", **kwargs):
    defaults = {
        "name": "Test Schedule",
        "schedule_type": schedule_type,
        "is_active": True,
    }
    if schedule_type == "fixed":
        defaults.update({
            "monday": True, "tuesday": True, "wednesday": True,
            "thursday": True, "friday": True,
            "entry_time": "09:00:00",
            "exit_time": "17:00:00",
        })
    defaults.update(kwargs)
    return client.post("/schedules", headers=auth_headers(admin), json=defaults)


class TestListSchedules:
    def test_admin_can_list(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.get("/schedules", headers=auth_headers(admin))
        assert resp.status_code == 200
        assert "items" in resp.json()

    def test_employee_cannot_list(self, client, db):
        company = make_company(db)
        emp_user = make_user(db, company=company, role=UserRole.EMPLOYEE)
        db.commit()

        resp = client.get("/schedules", headers=auth_headers(emp_user))
        assert resp.status_code == 403

    def test_manager_can_list(self, client, db):
        company = make_company(db)
        mgr = make_user(db, company=company, role=UserRole.MANAGER)
        db.commit()

        resp = client.get("/schedules", headers=auth_headers(mgr))
        assert resp.status_code == 200


class TestCreateScheduleNone:
    def test_create_none_schedule(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/schedules",
            headers=auth_headers(admin),
            json={"name": "Sin horario", "schedule_type": "none"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["schedule_type"] == "none"
        assert data["entry_time"] is None
        assert data["exit_time"] is None

    def test_none_schedule_no_days_required(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/schedules",
            headers=auth_headers(admin),
            json={"name": "Flexible", "schedule_type": "none"},
        )
        assert resp.status_code == 201


class TestCreateScheduleFixed:
    def test_create_fixed_schedule(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = make_schedule(client, admin, name="Oficina L-V")
        assert resp.status_code == 201
        data = resp.json()
        assert data["schedule_type"] == "fixed"
        assert data["monday"] is True
        assert data["friday"] is True
        assert data["entry_time"] == "09:00:00"
        assert data["exit_time"] == "17:00:00"

    def test_fixed_requires_at_least_one_day(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/schedules",
            headers=auth_headers(admin),
            json={
                "name": "Invalid",
                "schedule_type": "fixed",
                "entry_time": "09:00:00",
                "exit_time": "17:00:00",
            },
        )
        assert resp.status_code == 422

    def test_fixed_exit_must_be_after_entry(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/schedules",
            headers=auth_headers(admin),
            json={
                "name": "Bad Times",
                "schedule_type": "fixed",
                "monday": True,
                "entry_time": "17:00:00",
                "exit_time": "09:00:00",
            },
        )
        assert resp.status_code == 422

    def test_fixed_with_grace_minutes(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = make_schedule(client, admin, grace_minutes=10)
        assert resp.status_code == 201
        assert resp.json()["grace_minutes"] == 10


class TestCreateScheduleWeeklyCustom:
    def test_create_weekly_custom_schedule(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        payload = {
            "name": "Personalizado",
            "schedule_type": "weekly_custom",
            "rules": [
                {"weekday": 0, "is_working_day": True, "start_time": "09:00:00", "end_time": "17:00:00"},
                {"weekday": 1, "is_working_day": True, "start_time": "10:00:00", "end_time": "16:00:00"},
                {"weekday": 2, "is_working_day": False},
                {"weekday": 3, "is_working_day": True, "start_time": "08:30:00", "end_time": "14:30:00"},
                {"weekday": 4, "is_working_day": True, "start_time": "12:00:00", "end_time": "20:00:00"},
            ],
        }
        resp = client.post("/schedules", headers=auth_headers(admin), json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["schedule_type"] == "weekly_custom"
        assert len(data["rules"]) == 5
        monday_rule = next(r for r in data["rules"] if r["weekday"] == 0)
        assert monday_rule["start_time"] == "09:00:00"
        wed_rule = next(r for r in data["rules"] if r["weekday"] == 2)
        assert wed_rule["is_working_day"] is False

    def test_weekly_custom_requires_rules(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/schedules",
            headers=auth_headers(admin),
            json={"name": "NoRules", "schedule_type": "weekly_custom"},
        )
        assert resp.status_code == 422

    def test_weekly_custom_per_day_grace(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        payload = {
            "name": "With per-day grace",
            "schedule_type": "weekly_custom",
            "rules": [
                {
                    "weekday": 0,
                    "is_working_day": True,
                    "start_time": "09:00:00",
                    "end_time": "17:00:00",
                    "grace_minutes": 15,
                },
            ],
        }
        resp = client.post("/schedules", headers=auth_headers(admin), json=payload)
        assert resp.status_code == 201
        rule = resp.json()["rules"][0]
        assert rule["grace_minutes"] == 15


class TestCreateScheduleFlexibleWindow:
    def test_create_flexible_window_schedule(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        payload = {
            "name": "Ventana flexible",
            "schedule_type": "flexible_window",
            "monday": True, "tuesday": True, "wednesday": True, "thursday": True, "friday": True,
            "entry_window_start": "08:00:00",
            "entry_window_end": "10:00:00",
            "exit_window_start": "12:00:00",
            "exit_window_end": "15:00:00",
        }
        resp = client.post("/schedules", headers=auth_headers(admin), json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["schedule_type"] == "flexible_window"
        assert data["entry_window_start"] == "08:00:00"
        assert data["entry_window_end"] == "10:00:00"

    def test_flexible_window_requires_entry_window(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/schedules",
            headers=auth_headers(admin),
            json={"name": "No window", "schedule_type": "flexible_window", "monday": True},
        )
        assert resp.status_code == 422

    def test_flexible_window_entry_end_must_be_after_start(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        resp = client.post(
            "/schedules",
            headers=auth_headers(admin),
            json={
                "name": "Bad window",
                "schedule_type": "flexible_window",
                "monday": True,
                "entry_window_start": "10:00:00",
                "entry_window_end": "08:00:00",
            },
        )
        assert resp.status_code == 422


class TestUpdateSchedule:
    def test_update_name_and_type(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        schedule_id = make_schedule(client, admin, name="Original").json()["id"]
        resp = client.patch(
            f"/schedules/{schedule_id}",
            headers=auth_headers(admin),
            json={"name": "Updated"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated"

    def test_update_replaces_rules(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        schedule_id = client.post(
            "/schedules",
            headers=auth_headers(admin),
            json={
                "name": "Weekly",
                "schedule_type": "weekly_custom",
                "rules": [
                    {"weekday": 0, "is_working_day": True, "start_time": "09:00:00", "end_time": "17:00:00"},
                ],
            },
        ).json()["id"]

        resp = client.patch(
            f"/schedules/{schedule_id}",
            headers=auth_headers(admin),
            json={
                "rules": [
                    {"weekday": 0, "is_working_day": True, "start_time": "08:00:00", "end_time": "16:00:00"},
                    {"weekday": 1, "is_working_day": True, "start_time": "08:00:00", "end_time": "16:00:00"},
                ],
            },
        )
        assert resp.status_code == 200
        assert len(resp.json()["rules"]) == 2

    def test_cross_tenant_update_returns_404(self, client, db):
        company_a = make_company(db, slug="a", name="A")
        company_b = make_company(db, slug="b", name="B")
        admin_a = make_user(db, company=company_a, email="a@test.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=company_b, email="b@test.com", role=UserRole.ADMIN)
        db.commit()

        schedule_id = make_schedule(client, admin_a).json()["id"]
        resp = client.patch(
            f"/schedules/{schedule_id}",
            headers=auth_headers(admin_b),
            json={"name": "Hacked"},
        )
        assert resp.status_code == 404


class TestDeleteSchedule:
    def test_delete_soft_deactivates(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        db.commit()

        schedule_id = make_schedule(client, admin).json()["id"]
        resp = client.delete(f"/schedules/{schedule_id}", headers=auth_headers(admin))
        assert resp.status_code == 204

        # Not visible by default
        list_resp = client.get("/schedules", headers=auth_headers(admin))
        ids = [s["id"] for s in list_resp.json()["items"]]
        assert schedule_id not in ids

        # Visible with include_inactive=true
        list_resp = client.get("/schedules?include_inactive=true", headers=auth_headers(admin))
        ids = [s["id"] for s in list_resp.json()["items"]]
        assert schedule_id in ids


class TestEmployeeScheduleAssignment:
    def make_employee(self, db, company):
        import uuid
        from app.core.security import hash_password
        from app.models.user import User
        from app.models.employee import Employee

        user = User(
            id=uuid.uuid4(),
            company_id=company.id,
            email=f"emp-{uuid.uuid4().hex[:6]}@test.com",
            full_name="Test Employee",
            password_hash=hash_password("test-pw"),
            role=UserRole.EMPLOYEE,
        )
        db.add(user)
        db.flush()
        emp = Employee(
            id=uuid.uuid4(),
            company_id=company.id,
            user_id=user.id,
            first_name="Test",
            last_name="Emp",
        )
        db.add(emp)
        db.flush()
        return emp, user

    def test_assign_schedule_to_employee(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp, _ = self.make_employee(db, company)
        db.commit()

        schedule_id = make_schedule(client, admin).json()["id"]

        resp = client.put(
            f"/schedules/employees/{emp.id}/schedule",
            headers=auth_headers(admin),
            json={"schedule_id": schedule_id},
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == schedule_id

    def test_unassign_schedule(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp, _ = self.make_employee(db, company)
        db.commit()

        schedule_id = make_schedule(client, admin).json()["id"]
        client.put(
            f"/schedules/employees/{emp.id}/schedule",
            headers=auth_headers(admin),
            json={"schedule_id": schedule_id},
        )

        resp = client.put(
            f"/schedules/employees/{emp.id}/schedule",
            headers=auth_headers(admin),
            json={"schedule_id": None},
        )
        assert resp.status_code == 200
        assert resp.json() is None

    def test_get_employee_schedule(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)
        emp, _ = self.make_employee(db, company)
        db.commit()

        schedule_id = make_schedule(client, admin).json()["id"]
        client.put(
            f"/schedules/employees/{emp.id}/schedule",
            headers=auth_headers(admin),
            json={"schedule_id": schedule_id},
        )

        resp = client.get(
            f"/schedules/employees/{emp.id}/schedule",
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == schedule_id

    def test_cross_tenant_assignment_returns_404(self, client, db):
        company_a = make_company(db, slug="a", name="A")
        company_b = make_company(db, slug="b", name="B")
        admin_a = make_user(db, company=company_a, email="a@test.com", role=UserRole.ADMIN)
        admin_b = make_user(db, company=company_b, email="b@test.com", role=UserRole.ADMIN)
        emp_a, _ = self.make_employee(db, company_a)
        db.commit()

        schedule_a_id = make_schedule(client, admin_a).json()["id"]

        # admin_b cannot assign their employee to company_a's schedule
        resp = client.put(
            f"/schedules/employees/{emp_a.id}/schedule",
            headers=auth_headers(admin_b),
            json={"schedule_id": schedule_a_id},
        )
        assert resp.status_code == 404


class TestLateArrivalWithScheduleTypes:
    """Integration tests verifying late arrival detection per schedule type."""

    def make_employee_with_schedule(self, db, company, schedule):
        import uuid
        from app.core.security import hash_password
        from app.models.user import User
        from app.models.employee import Employee

        user = User(
            id=uuid.uuid4(),
            company_id=company.id,
            email=f"emp-{uuid.uuid4().hex[:6]}@test.com",
            full_name="Test Employee",
            password_hash=hash_password("test-pw"),
            role=UserRole.EMPLOYEE,
        )
        db.add(user)
        db.flush()
        emp = Employee(
            id=uuid.uuid4(),
            company_id=company.id,
            user_id=user.id,
            first_name="Test",
            last_name="Emp",
            schedule_id=schedule.id,
        )
        db.add(emp)
        db.flush()
        return emp, user

    def test_none_schedule_never_marks_late(self, client, db):
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)

        schedule = Schedule(
            company_id=company.id,
            name="None",
            schedule_type=ScheduleType.NONE,
            is_active=True,
        )
        db.add(schedule)
        db.flush()
        emp, emp_user = self.make_employee_with_schedule(db, company, schedule)
        db.commit()

        # Clock in very late — should not create a late arrival
        resp = client.post(
            "/attendance/clock-in",
            headers=auth_headers(emp_user),
            json={"method": "web"},
        )
        assert resp.status_code == 201

        late_resp = client.get("/late-arrivals", headers=auth_headers(admin))
        assert len(late_resp.json()["items"]) == 0

    def test_fixed_schedule_late_marks_late(self, client, db):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)

        schedule = Schedule(
            company_id=company.id,
            name="Fixed",
            schedule_type=ScheduleType.FIXED,
            monday=True, tuesday=True, wednesday=True, thursday=True, friday=True,
            saturday=True, sunday=True,
            entry_time=time(9, 0),
            exit_time=time(17, 0),
            is_active=True,
        )
        db.add(schedule)
        db.flush()
        emp, emp_user = self.make_employee_with_schedule(db, company, schedule)
        db.commit()

        # Clock in at 09:30 (30 min late, no grace)
        late_time = datetime(2026, 5, 19, 9, 30, 0, tzinfo=ZoneInfo("UTC"))
        with patch("app.services.attendance_service.datetime") as mock_dt:
            mock_dt.now.return_value = late_time
            mock_dt.side_effect = lambda *args, **kw: datetime(*args, **kw)
            resp = client.post(
                "/attendance/clock-in",
                headers=auth_headers(emp_user),
                json={"method": "web"},
            )
        assert resp.status_code == 201

        late_resp = client.get("/late-arrivals", headers=auth_headers(admin))
        items = late_resp.json()["items"]
        assert len(items) >= 1
        assert items[0]["delay_minutes_total"] == 30

    def test_flexible_window_within_window_not_late(self, client, db):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)

        schedule = Schedule(
            company_id=company.id,
            name="Flexible",
            schedule_type=ScheduleType.FLEXIBLE_WINDOW,
            monday=True, tuesday=True, wednesday=True, thursday=True, friday=True,
            saturday=True, sunday=True,
            entry_window_start=time(8, 0),
            entry_window_end=time(10, 0),
            is_active=True,
        )
        db.add(schedule)
        db.flush()
        emp, emp_user = self.make_employee_with_schedule(db, company, schedule)
        db.commit()

        # Clock in at 09:00 — within the 08:00-10:00 window, not late
        clock_time = datetime(2026, 5, 19, 9, 0, 0, tzinfo=ZoneInfo("UTC"))
        with patch("app.services.attendance_service.datetime") as mock_dt:
            mock_dt.now.return_value = clock_time
            mock_dt.side_effect = lambda *args, **kw: datetime(*args, **kw)
            resp = client.post(
                "/attendance/clock-in",
                headers=auth_headers(emp_user),
                json={"method": "web"},
            )
        assert resp.status_code == 201

        late_resp = client.get("/late-arrivals", headers=auth_headers(admin))
        assert len(late_resp.json()["items"]) == 0

    def test_flexible_window_after_window_marks_late(self, client, db):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        company = make_company(db)
        admin = make_user(db, company=company, role=UserRole.ADMIN)

        schedule = Schedule(
            company_id=company.id,
            name="Flexible",
            schedule_type=ScheduleType.FLEXIBLE_WINDOW,
            monday=True, tuesday=True, wednesday=True, thursday=True, friday=True,
            saturday=True, sunday=True,
            entry_window_start=time(8, 0),
            entry_window_end=time(10, 0),
            is_active=True,
        )
        db.add(schedule)
        db.flush()
        emp, emp_user = self.make_employee_with_schedule(db, company, schedule)
        db.commit()

        # Clock in at 10:07 — 7 min after window end
        clock_time = datetime(2026, 5, 19, 10, 7, 0, tzinfo=ZoneInfo("UTC"))
        with patch("app.services.attendance_service.datetime") as mock_dt:
            mock_dt.now.return_value = clock_time
            mock_dt.side_effect = lambda *args, **kw: datetime(*args, **kw)
            resp = client.post(
                "/attendance/clock-in",
                headers=auth_headers(emp_user),
                json={"method": "web"},
            )
        assert resp.status_code == 201

        late_resp = client.get("/late-arrivals", headers=auth_headers(admin))
        items = late_resp.json()["items"]
        assert len(items) >= 1
        assert items[0]["delay_minutes_total"] == 7
