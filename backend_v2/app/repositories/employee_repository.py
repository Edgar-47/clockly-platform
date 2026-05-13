from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.employee import Employee


class EmployeeRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    def list(
        self,
        *,
        include_inactive: bool = False,
        include_deleted: bool = False,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[Employee]:
        statement = select(Employee).where(Employee.company_id == self.company_id)
        if not include_deleted:
            statement = statement.where(Employee.is_deleted.is_(False))
        if not include_inactive:
            statement = statement.where(Employee.is_active.is_(True))
        statement = statement.order_by(Employee.is_active.desc(), Employee.first_name, Employee.last_name)
        if offset:
            statement = statement.offset(offset)
        if limit is not None:
            statement = statement.limit(limit)
        return list(self.db.scalars(statement))

    def count(self, *, include_inactive: bool = False, include_deleted: bool = False) -> int:
        statement = select(func.count(Employee.id)).where(Employee.company_id == self.company_id)
        if not include_deleted:
            statement = statement.where(Employee.is_deleted.is_(False))
        if not include_inactive:
            statement = statement.where(Employee.is_active.is_(True))
        return int(self.db.scalar(statement) or 0)

    def get(self, employee_id: UUID, *, include_deleted: bool = False) -> Employee | None:
        statement = select(Employee).where(
            Employee.id == employee_id,
            Employee.company_id == self.company_id,
        )
        if not include_deleted:
            statement = statement.where(Employee.is_deleted.is_(False))
        return self.db.scalar(statement)

    def get_active(self, employee_id: UUID) -> Employee | None:
        return self.db.scalar(
            select(Employee).where(
                Employee.id == employee_id,
                Employee.company_id == self.company_id,
                Employee.is_active.is_(True),
                Employee.is_deleted.is_(False),
            )
        )

    def get_by_user_id(
        self,
        user_id: UUID,
        *,
        include_inactive: bool = False,
        include_deleted: bool = False,
    ) -> Employee | None:
        statement = select(Employee).where(
            Employee.user_id == user_id,
            Employee.company_id == self.company_id,
        )
        if not include_inactive:
            statement = statement.where(Employee.is_active.is_(True))
        if not include_deleted:
            statement = statement.where(Employee.is_deleted.is_(False))
        return self.db.scalar(statement)

    def get_by_email(
        self,
        email: str,
        *,
        include_inactive: bool = False,
        include_deleted: bool = False,
    ) -> Employee | None:
        statement = select(Employee).where(
            Employee.company_id == self.company_id,
            func.lower(Employee.email) == email.lower(),
        )
        if not include_deleted:
            statement = statement.where(Employee.is_deleted.is_(False))
        if not include_inactive:
            statement = statement.where(Employee.is_active.is_(True))
        return self.db.scalar(statement)

    def get_by_dni(self, dni: str, *, include_deleted: bool = False) -> Employee | None:
        statement = select(Employee).where(
            Employee.company_id == self.company_id,
            Employee.dni == dni,
        )
        if not include_deleted:
            statement = statement.where(Employee.is_deleted.is_(False))
        return self.db.scalar(statement)

    def add(self, employee: Employee) -> Employee:
        self.db.add(employee)
        self.db.flush()
        return employee
