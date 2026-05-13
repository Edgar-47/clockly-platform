from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.cash_closure import CashClosure
from app.models.enums import CashClosureShift


class CashClosureRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    def _base(self):
        return select(CashClosure).where(CashClosure.company_id == self.company_id)

    def _apply_filters(
        self,
        stmt,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        shift: CashClosureShift | None = None,
        closed_by_user_id: UUID | None = None,
        location_id: UUID | None = None,
        has_incidence: bool | None = None,
    ):
        if date_from is not None:
            stmt = stmt.where(CashClosure.date >= date_from)
        if date_to is not None:
            stmt = stmt.where(CashClosure.date <= date_to)
        if shift is not None:
            stmt = stmt.where(CashClosure.shift == shift)
        if closed_by_user_id is not None:
            stmt = stmt.where(CashClosure.closed_by_user_id == closed_by_user_id)
        if location_id is not None:
            stmt = stmt.where(CashClosure.location_id == location_id)
        if has_incidence is not None:
            stmt = stmt.where(CashClosure.has_incidence == has_incidence)
        return stmt

    def list(
        self,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        shift: CashClosureShift | None = None,
        closed_by_user_id: UUID | None = None,
        location_id: UUID | None = None,
        has_incidence: bool | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[CashClosure]:
        stmt = self._base()
        stmt = self._apply_filters(
            stmt,
            date_from=date_from,
            date_to=date_to,
            shift=shift,
            closed_by_user_id=closed_by_user_id,
            location_id=location_id,
            has_incidence=has_incidence,
        )
        stmt = (
            stmt.options(
                selectinload(CashClosure.cash_drawers),
                selectinload(CashClosure.card_terminals),
                selectinload(CashClosure.closed_by),
                selectinload(CashClosure.location),
            )
            .order_by(CashClosure.date.desc(), CashClosure.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def count(
        self,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        shift: CashClosureShift | None = None,
        closed_by_user_id: UUID | None = None,
        location_id: UUID | None = None,
        has_incidence: bool | None = None,
    ) -> int:
        stmt = select(func.count(CashClosure.id)).where(CashClosure.company_id == self.company_id)
        stmt = self._apply_filters(
            stmt,
            date_from=date_from,
            date_to=date_to,
            shift=shift,
            closed_by_user_id=closed_by_user_id,
            location_id=location_id,
            has_incidence=has_incidence,
        )
        return int(self.db.scalar(stmt) or 0)

    def get(self, closure_id: UUID) -> CashClosure | None:
        return self.db.scalar(
            select(CashClosure)
            .where(
                CashClosure.id == closure_id,
                CashClosure.company_id == self.company_id,
            )
            .options(
                selectinload(CashClosure.cash_drawers),
                selectinload(CashClosure.card_terminals),
                selectinload(CashClosure.closed_by),
                selectinload(CashClosure.location),
            )
        )

    def add(self, closure: CashClosure) -> CashClosure:
        self.db.add(closure)
        self.db.flush()
        return closure

    def list_for_reporting(
        self,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        shift: CashClosureShift | None = None,
        closed_by_user_id: UUID | None = None,
        location_id: UUID | None = None,
        has_incidence: bool | None = None,
    ) -> list[CashClosure]:
        stmt = self._base()
        stmt = self._apply_filters(
            stmt,
            date_from=date_from,
            date_to=date_to,
            shift=shift,
            closed_by_user_id=closed_by_user_id,
            location_id=location_id,
            has_incidence=has_incidence,
        )
        stmt = stmt.options(
            selectinload(CashClosure.cash_drawers),
            selectinload(CashClosure.card_terminals),
            selectinload(CashClosure.closed_by),
            selectinload(CashClosure.location),
        ).order_by(CashClosure.date.desc(), CashClosure.created_at.desc())
        return list(self.db.scalars(stmt.limit(10_000)))
