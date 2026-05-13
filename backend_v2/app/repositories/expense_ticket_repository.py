from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import ExpenseCategory, ExpenseStatus, PaymentSource
from app.models.expense_ticket import ExpenseTicket


class ExpenseTicketRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    # ── Base query ────────────────────────────────────────────────────────────

    def _base(self):
        return (
            select(ExpenseTicket)
            .where(
                ExpenseTicket.company_id == self.company_id,
                ExpenseTicket.deleted_at.is_(None),
            )
        )

    def _apply_filters(
        self,
        stmt,
        *,
        employee_id: UUID | None = None,
        status: ExpenseStatus | None = None,
        category: ExpenseCategory | None = None,
        payment_source: PaymentSource | None = None,
        requires_reimbursement: bool | None = None,
        location_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        search: str | None = None,
    ):
        if employee_id is not None:
            stmt = stmt.where(ExpenseTicket.employee_id == employee_id)
        if status is not None:
            stmt = stmt.where(ExpenseTicket.status == status)
        if category is not None:
            stmt = stmt.where(ExpenseTicket.category == category)
        if payment_source is not None:
            stmt = stmt.where(ExpenseTicket.payment_source == payment_source)
        if requires_reimbursement is not None:
            stmt = stmt.where(ExpenseTicket.requires_reimbursement == requires_reimbursement)
        if location_id is not None:
            stmt = stmt.where(ExpenseTicket.location_id == location_id)
        if date_from is not None:
            stmt = stmt.where(ExpenseTicket.purchase_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(ExpenseTicket.purchase_date <= date_to)
        if search:
            term = f"%{search.lower()}%"
            stmt = stmt.where(ExpenseTicket.title.ilike(term))
        return stmt

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def list(
        self,
        *,
        employee_id: UUID | None = None,
        status: ExpenseStatus | None = None,
        category: ExpenseCategory | None = None,
        payment_source: PaymentSource | None = None,
        requires_reimbursement: bool | None = None,
        location_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ExpenseTicket]:
        stmt = self._base()
        stmt = self._apply_filters(
            stmt,
            employee_id=employee_id,
            status=status,
            category=category,
            payment_source=payment_source,
            requires_reimbursement=requires_reimbursement,
            location_id=location_id,
            date_from=date_from,
            date_to=date_to,
            search=search,
        )
        stmt = (
            stmt.options(
                selectinload(ExpenseTicket.employee),
                selectinload(ExpenseTicket.created_by),
            )
            .order_by(ExpenseTicket.purchase_date.desc(), ExpenseTicket.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def count(
        self,
        *,
        employee_id: UUID | None = None,
        status: ExpenseStatus | None = None,
        category: ExpenseCategory | None = None,
        payment_source: PaymentSource | None = None,
        requires_reimbursement: bool | None = None,
        location_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        search: str | None = None,
    ) -> int:
        stmt = select(func.count(ExpenseTicket.id)).where(
            ExpenseTicket.company_id == self.company_id,
            ExpenseTicket.deleted_at.is_(None),
        )
        stmt = self._apply_filters(
            stmt,
            employee_id=employee_id,
            status=status,
            category=category,
            payment_source=payment_source,
            requires_reimbursement=requires_reimbursement,
            location_id=location_id,
            date_from=date_from,
            date_to=date_to,
            search=search,
        )
        return int(self.db.scalar(stmt) or 0)

    def get(self, ticket_id: UUID) -> ExpenseTicket | None:
        return self.db.scalar(
            select(ExpenseTicket)
            .where(
                ExpenseTicket.id == ticket_id,
                ExpenseTicket.company_id == self.company_id,
                ExpenseTicket.deleted_at.is_(None),
            )
            .options(
                selectinload(ExpenseTicket.employee),
                selectinload(ExpenseTicket.created_by),
            )
        )

    def add(self, ticket: ExpenseTicket) -> ExpenseTicket:
        self.db.add(ticket)
        self.db.flush()
        return ticket

    # ── Summary / analytics ───────────────────────────────────────────────────

    def summary(
        self,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        employee_id: UUID | None = None,
        location_id: UUID | None = None,
    ) -> dict[str, Any]:
        base_where = [
            ExpenseTicket.company_id == self.company_id,
            ExpenseTicket.deleted_at.is_(None),
        ]
        if date_from:
            base_where.append(ExpenseTicket.purchase_date >= date_from)
        if date_to:
            base_where.append(ExpenseTicket.purchase_date <= date_to)
        if employee_id:
            base_where.append(ExpenseTicket.employee_id == employee_id)
        if location_id:
            base_where.append(ExpenseTicket.location_id == location_id)

        row = self.db.execute(
            select(
                func.count(ExpenseTicket.id).label("total_count"),
                func.coalesce(func.sum(ExpenseTicket.amount), 0).label("total_amount"),
                func.coalesce(
                    func.sum(case((ExpenseTicket.status == ExpenseStatus.PENDING, ExpenseTicket.amount), else_=0)),
                    0,
                ).label("pending_amount"),
                func.coalesce(
                    func.sum(case((ExpenseTicket.status == ExpenseStatus.IN_REVIEW, ExpenseTicket.amount), else_=0)),
                    0,
                ).label("in_review_amount"),
                func.coalesce(
                    func.sum(case((ExpenseTicket.status == ExpenseStatus.APPROVED, ExpenseTicket.amount), else_=0)),
                    0,
                ).label("approved_amount"),
                func.coalesce(
                    func.sum(case((ExpenseTicket.status == ExpenseStatus.REJECTED, ExpenseTicket.amount), else_=0)),
                    0,
                ).label("rejected_amount"),
                func.coalesce(
                    func.sum(case((ExpenseTicket.status == ExpenseStatus.PAID, ExpenseTicket.amount), else_=0)),
                    0,
                ).label("paid_amount"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                (ExpenseTicket.requires_reimbursement == True)  # noqa: E712
                                & (ExpenseTicket.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.IN_REVIEW])),
                                ExpenseTicket.reimbursement_amount,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ).label("pending_reimbursement_amount"),
            ).where(*base_where)
        ).one()

        total_count = row.total_count or 0
        total_amount = float(row.total_amount or 0)
        avg_amount = total_amount / total_count if total_count else 0.0

        return {
            "total_count": total_count,
            "total_amount": total_amount,
            "pending_amount": float(row.pending_amount or 0),
            "in_review_amount": float(row.in_review_amount or 0),
            "approved_amount": float(row.approved_amount or 0),
            "rejected_amount": float(row.rejected_amount or 0),
            "paid_amount": float(row.paid_amount or 0),
            "pending_reimbursement_amount": float(row.pending_reimbursement_amount or 0),
            "avg_amount": round(avg_amount, 2),
        }

    def list_for_export(
        self,
        *,
        employee_id: UUID | None = None,
        status: ExpenseStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        requires_reimbursement: bool | None = None,
    ) -> list[ExpenseTicket]:
        stmt = self._base()
        stmt = self._apply_filters(
            stmt,
            employee_id=employee_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            requires_reimbursement=requires_reimbursement,
        )
        stmt = stmt.options(
            selectinload(ExpenseTicket.employee),
            selectinload(ExpenseTicket.location),
            selectinload(ExpenseTicket.approved_by),
            selectinload(ExpenseTicket.paid_by),
        )
        stmt = stmt.order_by(ExpenseTicket.purchase_date.desc()).limit(10_000)
        return list(self.db.scalars(stmt))
