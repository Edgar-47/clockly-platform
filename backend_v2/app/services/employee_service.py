import logging
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, PermissionDenied
from app.core.security import hash_password, hash_pin, verify_password
from app.models.employee import Employee
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.schedule_repository import ScheduleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.services.plans import check_employee_limit

logger = logging.getLogger(__name__)

_UNSET = object()  # sentinel for "field not provided in PATCH payload"


class EmployeeService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.employees = EmployeeRepository(db, company_id=company_id)
        self.users = UserRepository(db)

    def list_employees(
        self,
        *,
        include_inactive: bool = False,
        limit: int | None = None,
        offset: int = 0,
    ) -> tuple[list[Employee], int]:
        items = self.employees.list(include_inactive=include_inactive, limit=limit, offset=offset)
        total = self.employees.count(include_inactive=include_inactive)
        return items, total

    def create_employee(self, payload: EmployeeCreate, *, actor_user_id: UUID | None = None) -> Employee:
        logger.info("[EmployeeService] Creating employee '%s %s' (company=%s)", payload.first_name, payload.last_name, self.company_id)

        if payload.is_active:
            check_employee_limit(self.db, self.company_id, actor_user_id=actor_user_id)

        # Pre-flight: DNI uniqueness within the company — gives a specific error before hitting the DB constraint.
        if payload.dni:
            if self.employees.get_by_dni(payload.dni) is not None:
                logger.warning("[EmployeeService] Duplicate DNI '%s' (company=%s)", payload.dni, self.company_id)
                raise ConflictError("An employee with this DNI already exists in this company.")

        linked_user: User | None = None
        if payload.email and payload.password:
            # Validated by schema: password always comes with email.
            if self.users.get_by_email(payload.email) is not None:
                logger.warning("[EmployeeService] Email '%s' already registered as a user.", payload.email)
                raise ConflictError("A user with this email already exists.")
            linked_user = User(
                company_id=self.company_id,
                email=payload.email,
                full_name=f"{payload.first_name} {payload.last_name}".strip(),
                password_hash=hash_password(payload.password),
                role=UserRole.EMPLOYEE,
            )

        employee = Employee(
            company_id=self.company_id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            phone=payload.phone,
            dni=payload.dni,
            role_title=payload.role_title,
            pin_hash=hash_pin(payload.pin) if payload.pin else None,
            hired_on=payload.hired_on,
            is_active=payload.is_active,
        )

        try:
            if linked_user is not None:
                self.users.add(linked_user)
                employee.user_id = linked_user.id
            self.employees.add(employee)
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            logger.error("[EmployeeService] IntegrityError on create: %s", exc.orig)
            _raise_from_integrity(exc)

        logger.info("[EmployeeService] Employee created: id=%s user_id=%s", employee.id, employee.user_id)
        return employee

    def update_employee(self, employee_id: UUID, payload: EmployeeUpdate, *, actor_user_id: UUID | None = None) -> Employee:
        logger.info("[EmployeeService] Updating employee id=%s", employee_id)

        employee = self.employees.get(employee_id)
        if employee is None:
            raise NotFoundError("Employee not found.")

        updates = payload.model_dump(exclude_unset=True)
        if updates.get("is_active") is True and not employee.is_active:
            check_employee_limit(self.db, self.company_id, actor_user_id=actor_user_id)

        # Pre-flight: DNI uniqueness if it's actually changing.
        new_dni = updates.get("dni")
        if new_dni and new_dni != employee.dni:
            existing = self.employees.get_by_dni(new_dni)
            if existing is not None and existing.id != employee_id:
                logger.warning("[EmployeeService] Duplicate DNI '%s' on update (employee=%s)", new_dni, employee_id)
                raise ConflictError("An employee with this DNI already exists in this company.")

        # Validate schedule_id belongs to the same company before assigning.
        if "schedule_id" in updates and updates["schedule_id"] is not None:
            schedule = ScheduleRepository(self.db, company_id=self.company_id).get(updates["schedule_id"])
            if schedule is None:
                raise NotFoundError("Schedule not found.")

        # PIN update: treated separately because the model stores pin_hash, not pin.
        # Sending pin=null clears the PIN; sending pin='1234' sets a new one.
        new_pin = updates.pop("pin", _UNSET)
        if new_pin is not _UNSET:
            employee.pin_hash = hash_pin(new_pin) if new_pin else None

        # Password update: updates the linked User's password_hash.
        new_password = updates.pop("password", _UNSET)
        if new_password is not _UNSET:
            if new_password is None:
                raise PermissionDenied("Password cannot be cleared; it can only be changed.")
            if employee.user_id is None:
                raise ConflictError("This employee has no linked user account and cannot have a password.")
            linked_user = self.users.get_by_id_in_company(employee.user_id, self.company_id)
            if linked_user is None:
                raise NotFoundError("Linked user account not found.")
            linked_user.password_hash = hash_password(new_password)
            self.db.add(linked_user)
            logger.info("[EmployeeService] Password updated for user_id=%s (employee=%s)", employee.user_id, employee_id)

        # Apply remaining scalar fields.
        new_is_active = updates.get("is_active")
        for key, value in updates.items():
            setattr(employee, key, value)
        self.db.add(employee)

        # Sync User.is_active when Employee.is_active changes to prevent impossible states:
        # deactivated employee with active login, or reactivated employee unable to log in.
        if new_is_active is not None and employee.user_id is not None:
            linked_user = self.users.get_by_id_in_company(employee.user_id, self.company_id)
            if linked_user is not None and linked_user.is_active != new_is_active:
                linked_user.is_active = new_is_active
                self.db.add(linked_user)
                logger.info(
                    "[EmployeeService] Synced User.is_active=%s for user_id=%s (employee=%s)",
                    new_is_active,
                    employee.user_id,
                    employee_id,
                )

        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            logger.error("[EmployeeService] IntegrityError on update: %s", exc.orig)
            _raise_from_integrity(exc)

        logger.info("[EmployeeService] Employee updated: id=%s", employee_id)
        return employee

    def reset_pin(self, employee_id: UUID, pin: str | None, *, actor_user_id: UUID | None = None) -> Employee:
        employee = self.employees.get(employee_id)
        if employee is None:
            raise NotFoundError("Employee not found.")
        employee.pin_hash = hash_pin(pin) if pin else None
        self.db.add(employee)
        self.db.commit()
        logger.info("[EmployeeService] Kiosk PIN reset for employee=%s by user=%s", employee_id, actor_user_id)
        return employee

    def change_own_pin(self, actor: User, *, current_pin: str | None, new_pin: str) -> Employee:
        employee = self.employees.get_by_user_id(actor.id)
        if employee is None:
            raise NotFoundError("Employee not found.")
        if employee.pin_hash and (not current_pin or not verify_password(current_pin, employee.pin_hash)):
            raise PermissionDenied("Current PIN is incorrect.")
        employee.pin_hash = hash_pin(new_pin)
        self.db.add(employee)
        self.db.commit()
        logger.info("[EmployeeService] Employee changed own kiosk PIN: employee=%s", employee.id)
        return employee


def _raise_from_integrity(exc: IntegrityError) -> None:
    """Map PostgreSQL constraint names to specific ConflictErrors."""
    orig = str(exc.orig).lower() if exc.orig else ""
    if "uq_employees_company_dni" in orig:
        raise ConflictError("An employee with this DNI already exists in this company.") from exc
    if "uq_employees_company_user" in orig:
        raise ConflictError("This user account is already linked to another employee.") from exc
    if "uq_users_email" in orig:
        raise ConflictError("A user with this email already exists.") from exc
    raise ConflictError("Employee data conflicts with an existing record.") from exc
