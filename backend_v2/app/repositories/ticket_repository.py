from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import TicketStatus
from app.models.ticket import Ticket


class TicketRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    def list(
        self,
        *,
        employee_id: UUID | None = None,
        status: TicketStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Ticket]:
        statement = select(Ticket).where(Ticket.company_id == self.company_id)
        if employee_id:
            statement = statement.where(Ticket.employee_id == employee_id)
        if status:
            statement = statement.where(Ticket.status == status)
        if date_from:
            statement = statement.where(Ticket.occurred_on >= date_from)
        if date_to:
            statement = statement.where(Ticket.occurred_on <= date_to)
        statement = (
            statement.order_by(Ticket.created_at.desc()).offset(offset).limit(limit)
        )
        return list(self.db.scalars(statement))

    def count(
        self,
        *,
        employee_id: UUID | None = None,
        status: TicketStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> int:
        statement = select(func.count(Ticket.id)).where(Ticket.company_id == self.company_id)
        if employee_id:
            statement = statement.where(Ticket.employee_id == employee_id)
        if status:
            statement = statement.where(Ticket.status == status)
        if date_from:
            statement = statement.where(Ticket.occurred_on >= date_from)
        if date_to:
            statement = statement.where(Ticket.occurred_on <= date_to)
        return int(self.db.scalar(statement) or 0)

    def get(self, ticket_id: UUID) -> Ticket | None:
        return self.db.scalar(
            select(Ticket).where(
                Ticket.id == ticket_id,
                Ticket.company_id == self.company_id,
            )
        )

    def add(self, ticket: Ticket) -> Ticket:
        self.db.add(ticket)
        self.db.flush()
        return ticket
