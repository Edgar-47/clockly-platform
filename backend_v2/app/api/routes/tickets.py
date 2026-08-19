from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, PermissionDenied
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.enums import TicketStatus, UserRole
from app.models.ticket import Ticket
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.ticket_repository import TicketRepository
from app.schemas.ticket import TicketCreate, TicketListResponse, TicketRead, TicketUpdate
from app.services.plans import check_plan_feature


router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=TicketListResponse)
def list_tickets(
    employee_id: UUID | None = Query(default=None),
    ticket_status: TicketStatus | None = Query(default=None, alias="status"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("tickets:read")),
    db: Session = Depends(get_db),
) -> TicketListResponse:
    if employee_id is not None or date_from is not None or date_to is not None:
        check_plan_feature(db, ctx.company_id, "has_advanced_filters", actor_user_id=ctx.user.id)

    # Employees can only read their own tickets — force filter to their employee profile.
    if ctx.user.role == UserRole.EMPLOYEE:
        own = EmployeeRepository(db, company_id=ctx.company_id).get_by_user_id(ctx.user.id)
        employee_id = own.id if own else None
        if own is None:
            return TicketListResponse(items=[], total=0, limit=limit, offset=offset)

    repo = TicketRepository(db, company_id=ctx.company_id)
    filter_kwargs = dict(employee_id=employee_id, status=ticket_status, date_from=date_from, date_to=date_to)
    items = repo.list(**filter_kwargs, limit=limit, offset=offset)
    total = repo.count(**filter_kwargs)
    return TicketListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    ctx: TenantContext = Depends(require_permission("tickets:write")),
    db: Session = Depends(get_db),
) -> TicketRead:
    employee_repo = EmployeeRepository(db, company_id=ctx.company_id)
    employee_id = payload.employee_id

    if ctx.user.role == UserRole.EMPLOYEE:
        # Employees must create tickets against their own employee profile.
        own = employee_repo.get_by_user_id(ctx.user.id)
        if own is None:
            raise NotFoundError("Employee profile not found for this user.")
        employee_id = own.id
    elif employee_id is not None:
        # Admins/managers providing employee_id must own that employee (same company).
        if employee_repo.get(employee_id) is None:
            raise NotFoundError("Employee not found.")

    ticket = Ticket(
        company_id=ctx.company_id,
        employee_id=employee_id,
        user_id=ctx.user.id,
        title=payload.title,
        description=payload.description,
        occurred_on=payload.occurred_on,
        attachment_key=payload.attachment_key,
    )
    TicketRepository(db, company_id=ctx.company_id).add(ticket)
    db.commit()
    return ticket


@router.patch("/{ticket_id}", response_model=TicketRead)
def update_ticket(
    ticket_id: UUID,
    payload: TicketUpdate,
    ctx: TenantContext = Depends(require_permission("tickets:write")),
    db: Session = Depends(get_db),
) -> TicketRead:
    if ctx.user.role == UserRole.EMPLOYEE:
        raise PermissionDenied("Employees cannot resolve tickets.")

    repo = TicketRepository(db, company_id=ctx.company_id)
    ticket = repo.get(ticket_id)
    if ticket is None:
        raise NotFoundError("Ticket not found.")

    if payload.status == ticket.status:
        return ticket

    if payload.status not in _ALLOWED_TICKET_TRANSITIONS.get(ticket.status, set()):
        raise ConflictError(
            f"Cannot move ticket from '{ticket.status.value}' to '{payload.status.value}'."
        )

    ticket.status = payload.status
    db.add(ticket)
    db.commit()
    return ticket


_ALLOWED_TICKET_TRANSITIONS: dict[TicketStatus, set[TicketStatus]] = {
    TicketStatus.OPEN: {TicketStatus.IN_REVIEW, TicketStatus.RESOLVED, TicketStatus.REJECTED},
    TicketStatus.IN_REVIEW: {TicketStatus.RESOLVED, TicketStatus.REJECTED},
    TicketStatus.RESOLVED: set(),
    TicketStatus.REJECTED: set(),
}
