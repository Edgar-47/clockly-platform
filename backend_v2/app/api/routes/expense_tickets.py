"""Expense tickets (gastos) API routes."""
from __future__ import annotations

import uuid
import re
from datetime import UTC, date, datetime
from decimal import Decimal
from functools import partial
from io import BytesIO
from pathlib import Path
from typing import Literal
from urllib.parse import quote
from uuid import UUID

from anyio import to_thread
from fastapi import APIRouter, Depends, Query, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
import structlog

from app.core.errors import ConflictError, NotFoundError, PermissionDenied, ServiceUnavailableError
from app.core.rate_limit import export_limiter, upload_limiter
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.company_location import CompanyLocation
from app.models.enums import (
    ExpenseCategory,
    ExpenseEventType,
    ExpenseStatus,
    PaymentSource,
    UserRole,
)
from app.models.expense_ticket import ExpenseTicket
from app.models.expense_ticket_event import ExpenseTicketEvent
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.expense_ticket_repository import ExpenseTicketRepository
from app.schemas.expense_ticket import (
    ExpenseTicketCreate,
    ExpenseTicketListResponse,
    ExpenseTicketMarkPaid,
    ExpenseTicketRead,
    ExpenseTicketReject,
    ExpenseTicketSummary,
    ExpenseTicketUpdate,
)
from app.services.storage import StorageBackend, StorageBackendError, StorageNotFoundError, get_storage_backend
from app.services.xlsx_report import (
    DATE_FORMAT,
    MONEY_FORMAT,
    add_excel_table,
    apply_status_style,
    metric_number,
    prepare_worksheet,
    require_xlsx_kit,
    safe_spreadsheet_value,
    set_column_widths,
    set_number_format,
    style_table_body,
    write_kpi_cards,
    write_report_title,
    write_table_header,
)

router = APIRouter(prefix="/expense-tickets", tags=["expense-tickets"])
logger = structlog.get_logger(__name__)

_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
_FILENAME_SAFE_RE = re.compile(r"[^A-Za-z0-9._ -]+")


def _record_event(
    db: Session,
    *,
    ticket_id: UUID,
    user_id: UUID | None,
    event_type: ExpenseEventType,
    old_value: str | None = None,
    new_value: str | None = None,
    notes: str | None = None,
) -> None:
    event = ExpenseTicketEvent(
        id=uuid.uuid4(),
        ticket_id=ticket_id,
        user_id=user_id,
        event_type=event_type,
        old_value=old_value,
        new_value=new_value,
        notes=notes,
    )
    db.add(event)


def _own_employee_id(db: Session, ctx: TenantContext) -> UUID | None:
    own = EmployeeRepository(db, company_id=ctx.company_id).get_by_user_id(ctx.user.id)
    return own.id if own else None


def _empty_summary() -> ExpenseTicketSummary:
    return ExpenseTicketSummary(
        total_count=0,
        total_amount=0.0,
        pending_amount=0.0,
        in_review_amount=0.0,
        approved_amount=0.0,
        rejected_amount=0.0,
        paid_amount=0.0,
        pending_reimbursement_amount=0.0,
        avg_amount=0.0,
    )


# ── Allowed status transitions ────────────────────────────────────────────────

_ALLOWED_TRANSITIONS: dict[ExpenseStatus, set[ExpenseStatus]] = {
    ExpenseStatus.PENDING: {ExpenseStatus.IN_REVIEW, ExpenseStatus.APPROVED, ExpenseStatus.REJECTED},
    ExpenseStatus.IN_REVIEW: {ExpenseStatus.APPROVED, ExpenseStatus.REJECTED},
    ExpenseStatus.APPROVED: {ExpenseStatus.PAID},
    ExpenseStatus.REJECTED: set(),
    ExpenseStatus.PAID: set(),
}


# ── LIST ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=ExpenseTicketListResponse)
def list_expense_tickets(
    employee_id: UUID | None = Query(default=None),
    expense_status: ExpenseStatus | None = Query(default=None, alias="status"),
    category: ExpenseCategory | None = Query(default=None),
    payment_source: PaymentSource | None = Query(default=None),
    requires_reimbursement: bool | None = Query(default=None),
    location_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("expense_tickets:read")),
    db: Session = Depends(get_db),
) -> ExpenseTicketListResponse:
    if ctx.user.role == UserRole.EMPLOYEE:
        employee_id = _own_employee_id(db, ctx)
        if employee_id is None:
            return ExpenseTicketListResponse(items=[], total=0, limit=limit, offset=offset)

    repo = ExpenseTicketRepository(db, company_id=ctx.company_id)
    filter_kwargs = dict(
        employee_id=employee_id,
        status=expense_status,
        category=category,
        payment_source=payment_source,
        requires_reimbursement=requires_reimbursement,
        location_id=location_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )
    items = repo.list(**filter_kwargs, limit=limit, offset=offset)
    total = repo.count(**filter_kwargs)
    return ExpenseTicketListResponse(items=items, total=total, limit=limit, offset=offset)


# ── SUMMARY ───────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=ExpenseTicketSummary)
def expense_ticket_summary(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    employee_id: UUID | None = Query(default=None),
    location_id: UUID | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("expense_tickets:read")),
    db: Session = Depends(get_db),
) -> ExpenseTicketSummary:
    if ctx.user.role == UserRole.EMPLOYEE:
        employee_id = _own_employee_id(db, ctx)
        if employee_id is None:
            return _empty_summary()

    data = ExpenseTicketRepository(db, company_id=ctx.company_id).summary(
        date_from=date_from,
        date_to=date_to,
        employee_id=employee_id,
        location_id=location_id,
    )
    return ExpenseTicketSummary(**data)


# ── EXPORT ────────────────────────────────────────────────────────────────────

@router.get("/export")
def export_expense_tickets(
    export_format: Literal["xlsx"] = Query(default="xlsx", alias="format"),
    employee_id: UUID | None = Query(default=None),
    expense_status: ExpenseStatus | None = Query(default=None, alias="status"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    requires_reimbursement: bool | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("expense_tickets:export")),
    db: Session = Depends(get_db),
) -> Response:
    _rate_limit_export(ctx)
    tickets = ExpenseTicketRepository(db, company_id=ctx.company_id).list_for_export(
        employee_id=employee_id,
        status=expense_status,
        date_from=date_from,
        date_to=date_to,
        requires_reimbursement=requires_reimbursement,
    )
    content = _build_expense_xlsx(company_name=ctx.company.name, tickets=tickets)
    filename = f"clockly-gastos-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "private, no-store"},
    )


# ── GET ONE ───────────────────────────────────────────────────────────────────

@router.get("/{ticket_id}", response_model=ExpenseTicketRead)
def get_expense_ticket(
    ticket_id: UUID,
    ctx: TenantContext = Depends(require_permission("expense_tickets:read")),
    db: Session = Depends(get_db),
) -> ExpenseTicketRead:
    ticket = _get_and_scope(ticket_id, db, ctx)
    return ticket


# ── CREATE ────────────────────────────────────────────────────────────────────

@router.post("", response_model=ExpenseTicketRead, status_code=status.HTTP_201_CREATED)
def create_expense_ticket(
    payload: ExpenseTicketCreate,
    ctx: TenantContext = Depends(require_permission("expense_tickets:write")),
    db: Session = Depends(get_db),
) -> ExpenseTicketRead:
    employee_repo = EmployeeRepository(db, company_id=ctx.company_id)
    _assert_location_scope(db, ctx.company_id, payload.location_id)

    if ctx.user.role == UserRole.EMPLOYEE:
        own = employee_repo.get_by_user_id(ctx.user.id)
        if own is None:
            raise NotFoundError("Employee profile not found for this user.")
        employee_id = own.id
    else:
        employee_id = payload.employee_id
        if employee_id is not None and employee_repo.get(employee_id) is None:
            raise NotFoundError("Empleado no encontrado.")

    ticket = ExpenseTicket(
        id=uuid.uuid4(),
        company_id=ctx.company_id,
        location_id=payload.location_id,
        employee_id=employee_id,
        created_by_user_id=ctx.user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        purchase_date=payload.purchase_date,
        amount=payload.amount,
        currency=payload.currency.upper(),
        payment_source=payload.payment_source,
        requires_reimbursement=payload.requires_reimbursement,
        reimbursement_amount=payload.reimbursement_amount,
        internal_notes=payload.internal_notes,
        status=ExpenseStatus.PENDING,
    )
    repo = ExpenseTicketRepository(db, company_id=ctx.company_id)
    repo.add(ticket)
    _record_event(db, ticket_id=ticket.id, user_id=ctx.user.id, event_type=ExpenseEventType.CREATED)
    db.commit()
    return ticket


# ── UPDATE ────────────────────────────────────────────────────────────────────

@router.patch("/{ticket_id}", response_model=ExpenseTicketRead)
def update_expense_ticket(
    ticket_id: UUID,
    payload: ExpenseTicketUpdate,
    ctx: TenantContext = Depends(require_permission("expense_tickets:write")),
    db: Session = Depends(get_db),
) -> ExpenseTicketRead:
    ticket = _get_and_scope(ticket_id, db, ctx)

    # Employees can only edit their own pending tickets.
    if ctx.user.role == UserRole.EMPLOYEE:
        if ticket.status != ExpenseStatus.PENDING:
            raise PermissionDenied("Solo puedes editar tus gastos mientras están pendientes.")

    # Paid tickets can only be edited by approvers.
    if ticket.status == ExpenseStatus.PAID and "expense_tickets:approve" not in ctx.permissions:
        raise PermissionDenied("No puedes editar un gasto ya pagado.")

    update_data = payload.model_dump(exclude_unset=True)
    if "location_id" in update_data:
        _assert_location_scope(db, ctx.company_id, payload.location_id)

    changed = False
    for field, value in update_data.items():
        if getattr(ticket, field) != value:
            setattr(ticket, field, value)
            changed = True

    if changed:
        _record_event(db, ticket_id=ticket.id, user_id=ctx.user.id, event_type=ExpenseEventType.UPDATED)
        db.add(ticket)
        db.commit()
    return ticket


# ── DELETE ────────────────────────────────────────────────────────────────────

@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense_ticket(
    ticket_id: UUID,
    ctx: TenantContext = Depends(require_permission("expense_tickets:write")),
    db: Session = Depends(get_db),
) -> None:
    ticket = _get_and_scope(ticket_id, db, ctx)

    if ctx.user.role == UserRole.EMPLOYEE:
        if ticket.status not in {ExpenseStatus.PENDING}:
            raise PermissionDenied("Solo puedes eliminar tus gastos mientras están pendientes.")

    ticket.deleted_at = datetime.now(UTC)
    db.add(ticket)
    db.commit()


# ── APPROVE ───────────────────────────────────────────────────────────────────

@router.post("/{ticket_id}/approve", response_model=ExpenseTicketRead)
def approve_expense_ticket(
    ticket_id: UUID,
    ctx: TenantContext = Depends(require_permission("expense_tickets:approve")),
    db: Session = Depends(get_db),
) -> ExpenseTicketRead:
    ticket = _get_and_scope_no_employee_filter(ticket_id, db, ctx)

    if ExpenseStatus.APPROVED not in _ALLOWED_TRANSITIONS.get(ticket.status, set()):
        raise ConflictError(
            f"No se puede aprobar un gasto en estado '{ticket.status.value}'."
        )

    now = datetime.now(UTC)
    ticket.status = ExpenseStatus.APPROVED
    ticket.approved_by_user_id = ctx.user.id
    ticket.approved_at = now
    ticket.rejection_reason = None
    _record_event(
        db,
        ticket_id=ticket.id,
        user_id=ctx.user.id,
        event_type=ExpenseEventType.APPROVED,
        old_value=ExpenseStatus.PENDING.value,
        new_value=ExpenseStatus.APPROVED.value,
    )
    db.add(ticket)
    db.commit()
    return ticket


# ── REJECT ────────────────────────────────────────────────────────────────────

@router.post("/{ticket_id}/reject", response_model=ExpenseTicketRead)
def reject_expense_ticket(
    ticket_id: UUID,
    payload: ExpenseTicketReject,
    ctx: TenantContext = Depends(require_permission("expense_tickets:approve")),
    db: Session = Depends(get_db),
) -> ExpenseTicketRead:
    ticket = _get_and_scope_no_employee_filter(ticket_id, db, ctx)

    if ExpenseStatus.REJECTED not in _ALLOWED_TRANSITIONS.get(ticket.status, set()):
        raise ConflictError(
            f"No se puede rechazar un gasto en estado '{ticket.status.value}'."
        )

    now = datetime.now(UTC)
    ticket.status = ExpenseStatus.REJECTED
    ticket.rejected_by_user_id = ctx.user.id
    ticket.rejected_at = now
    ticket.rejection_reason = payload.rejection_reason
    _record_event(
        db,
        ticket_id=ticket.id,
        user_id=ctx.user.id,
        event_type=ExpenseEventType.REJECTED,
        new_value=payload.rejection_reason,
    )
    db.add(ticket)
    db.commit()
    return ticket


# ── MARK PAID ─────────────────────────────────────────────────────────────────

@router.post("/{ticket_id}/mark-paid", response_model=ExpenseTicketRead)
def mark_expense_ticket_paid(
    ticket_id: UUID,
    payload: ExpenseTicketMarkPaid,
    ctx: TenantContext = Depends(require_permission("expense_tickets:approve")),
    db: Session = Depends(get_db),
) -> ExpenseTicketRead:
    ticket = _get_and_scope_no_employee_filter(ticket_id, db, ctx)

    if ticket.status != ExpenseStatus.APPROVED:
        raise ConflictError("Solo se pueden marcar como pagados los gastos aprobados.")

    now = datetime.now(UTC)
    ticket.status = ExpenseStatus.PAID
    ticket.paid_by_user_id = ctx.user.id
    ticket.paid_at = now
    _record_event(
        db,
        ticket_id=ticket.id,
        user_id=ctx.user.id,
        event_type=ExpenseEventType.PAID,
        notes=payload.notes,
    )
    db.add(ticket)
    db.commit()
    return ticket


# ── ATTACHMENT UPLOAD ─────────────────────────────────────────────────────────

@router.post("/{ticket_id}/attachment", response_model=ExpenseTicketRead)
async def upload_attachment(
    ticket_id: UUID,
    file: UploadFile,
    ctx: TenantContext = Depends(require_permission("expense_tickets:write")),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
) -> ExpenseTicketRead:
    _rate_limit_upload(ctx)
    ticket = _get_and_scope(ticket_id, db, ctx)

    if ticket.status == ExpenseStatus.PAID and "expense_tickets:approve" not in ctx.permissions:
        raise PermissionDenied("No puedes modificar un gasto ya pagado.")

    # Validate MIME type via the content_type header (browser-set) and magic bytes.
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    if content_type not in _ALLOWED_MIME_TYPES:
        raise ConflictError(
            f"Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF. (recibido: {content_type})"
        )

    raw = await file.read(_MAX_UPLOAD_BYTES + 1)
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise ConflictError("El archivo supera el límite de 5 MB.")
    if not raw:
        raise ConflictError("El archivo adjunto está vacío.")

    # Validate magic bytes to prevent MIME spoofing.
    _assert_magic(raw, content_type)

    ext = _ext_for_mime(content_type)
    object_key = _build_attachment_key(
        company_id=ctx.company_id,
        original_filename=file.filename,
        content_type=content_type,
    )
    old_key = ticket.attachment_key

    try:
        await to_thread.run_sync(
            partial(
                storage.upload_file,
                object_key,
                raw,
                content_type=content_type,
                metadata={"module": "expense_tickets"},
            )
        )
    except StorageBackendError as exc:
        logger.warning(
            "expense_attachment.upload_failed",
            backend=storage.name,
            company_id=str(ctx.company_id),
            ticket_id=str(ticket.id),
            error_type=type(exc).__name__,
        )
        raise ServiceUnavailableError("No se pudo almacenar el archivo adjunto. Intentalo de nuevo.") from exc

    ticket.attachment_key = object_key
    ticket.attachment_file_name = _safe_original_filename(file.filename, fallback=f"attachment{ext}", extension=ext)
    ticket.attachment_mime_type = content_type
    ticket.attachment_size = len(raw)

    _record_event(
        db,
        ticket_id=ticket.id,
        user_id=ctx.user.id,
        event_type=ExpenseEventType.ATTACHMENT_UPLOADED,
        new_value=ticket.attachment_file_name,
    )
    db.add(ticket)
    try:
        db.commit()
    except Exception:
        await _delete_storage_object(storage, object_key, ctx=ctx, ticket=ticket)
        raise

    if old_key and old_key != object_key:
        await _delete_storage_object(storage, old_key, ctx=ctx, ticket=ticket)
    return ticket


# ── ATTACHMENT DOWNLOAD ───────────────────────────────────────────────────────

@router.get("/{ticket_id}/attachment")
async def download_attachment(
    ticket_id: UUID,
    ctx: TenantContext = Depends(require_permission("expense_tickets:read")),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
) -> StreamingResponse:
    ticket = _get_and_scope(ticket_id, db, ctx)

    if not ticket.attachment_key:
        raise NotFoundError("Este gasto no tiene archivo adjunto.")

    try:
        stored = await to_thread.run_sync(storage.download_file, ticket.attachment_key)
    except StorageNotFoundError as exc:
        raise NotFoundError("Archivo no encontrado en almacenamiento.") from exc
    except StorageBackendError as exc:
        logger.warning(
            "expense_attachment.download_failed",
            backend=storage.name,
            company_id=str(ctx.company_id),
            ticket_id=str(ticket.id),
            error_type=type(exc).__name__,
        )
        raise ServiceUnavailableError("No se pudo recuperar el archivo adjunto. Intentalo de nuevo.") from exc

    filename = _safe_original_filename(
        ticket.attachment_file_name,
        fallback="adjunto",
        extension=_ext_for_mime(ticket.attachment_mime_type or ""),
    )
    headers = {
        "Cache-Control": "private, no-store",
        "Content-Disposition": _content_disposition(filename),
    }
    if stored.content_length is not None:
        headers["Content-Length"] = str(stored.content_length)

    return StreamingResponse(
        stored.iter_chunks(),
        media_type=ticket.attachment_mime_type or stored.content_type or "application/octet-stream",
        headers=headers,
    )


@router.delete("/{ticket_id}/attachment", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    ticket_id: UUID,
    ctx: TenantContext = Depends(require_permission("expense_tickets:write")),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
) -> None:
    ticket = _get_and_scope(ticket_id, db, ctx)

    if ticket.status == ExpenseStatus.PAID and "expense_tickets:approve" not in ctx.permissions:
        raise PermissionDenied("No puedes modificar un gasto ya pagado.")
    old_key = ticket.attachment_key
    if not old_key:
        raise NotFoundError("Este gasto no tiene archivo adjunto.")

    old_name = ticket.attachment_file_name
    ticket.attachment_key = None
    ticket.attachment_file_name = None
    ticket.attachment_mime_type = None
    ticket.attachment_size = None

    _record_event(
        db,
        ticket_id=ticket.id,
        user_id=ctx.user.id,
        event_type=ExpenseEventType.UPDATED,
        old_value=old_name,
        new_value=None,
        notes="Archivo adjunto eliminado",
    )
    db.add(ticket)
    db.commit()

    await _delete_storage_object(storage, old_key, ctx=ctx, ticket=ticket)


# ── HELPERS ───────────────────────────────────────────────────────────────────

def _get_and_scope(ticket_id: UUID, db: Session, ctx: TenantContext) -> ExpenseTicket:
    """Get ticket and enforce employee scoping."""
    ticket = ExpenseTicketRepository(db, company_id=ctx.company_id).get(ticket_id)
    if ticket is None:
        raise NotFoundError("Gasto no encontrado.")

    if ctx.user.role == UserRole.EMPLOYEE:
        own_id = _own_employee_id(db, ctx)
        if own_id is None or ticket.employee_id != own_id:
            raise PermissionDenied("No tienes permiso para ver este gasto.")

    return ticket


def _get_and_scope_no_employee_filter(ticket_id: UUID, db: Session, ctx: TenantContext) -> ExpenseTicket:
    """Get ticket without employee scoping (for approve/reject/pay actions)."""
    ticket = ExpenseTicketRepository(db, company_id=ctx.company_id).get(ticket_id)
    if ticket is None:
        raise NotFoundError("Gasto no encontrado.")
    return ticket


def _assert_location_scope(db: Session, company_id: UUID, location_id: UUID | None) -> None:
    if location_id is None:
        return
    exists = db.scalar(
        select(CompanyLocation.id).where(
            CompanyLocation.id == location_id,
            CompanyLocation.company_id == company_id,
            CompanyLocation.is_active.is_(True),
        )
    )
    if exists is None:
        raise NotFoundError("Local no encontrado.")


def _rate_limit_export(ctx: TenantContext) -> None:
    export_limiter.check(f"company:{ctx.company_id}:user:{ctx.user.id}")


def _rate_limit_upload(ctx: TenantContext) -> None:
    upload_limiter.check(f"company:{ctx.company_id}:user:{ctx.user.id}")


def _safe_original_filename(filename: str | None, *, fallback: str, extension: str | None = None) -> str:
    name = Path(filename or "").name.strip().replace("\x00", "")
    name = name.replace("\r", "").replace("\n", "")
    name = _FILENAME_SAFE_RE.sub("_", name)
    name = name.strip(" .")
    if not name:
        name = fallback
    if extension:
        stem = Path(name).stem or Path(fallback).stem or "attachment"
        name = f"{stem}{extension}"
    if len(name) > 180 and extension:
        return f"{Path(name).stem[: 180 - len(extension)]}{extension}"
    return name[:180]


def _build_attachment_key(*, company_id: UUID, original_filename: str | None, content_type: str) -> str:
    now = datetime.now(UTC)
    ext = _ext_for_mime(content_type)
    stem = _safe_object_key_stem(original_filename)
    return f"companies/{company_id}/expense-tickets/{now:%Y/%m}/{uuid.uuid4()}_{stem}{ext}"


def _safe_object_key_stem(filename: str | None) -> str:
    stem = Path(_safe_original_filename(filename, fallback="attachment")).stem
    stem = re.sub(r"[\s.]+", "-", stem.strip().lower())
    stem = re.sub(r"[^a-z0-9_-]+", "_", stem)
    stem = stem.strip("-_")
    return (stem or "attachment")[:80]


def _content_disposition(filename: str) -> str:
    quoted = quote(filename)
    safe = filename.replace('"', "_")
    return f'attachment; filename="{safe}"; filename*=UTF-8\'\'{quoted}'


async def _delete_storage_object(
    storage: StorageBackend,
    key: str,
    *,
    ctx: TenantContext,
    ticket: ExpenseTicket,
) -> None:
    try:
        await to_thread.run_sync(storage.delete_file, key)
    except StorageBackendError as exc:
        logger.warning(
            "expense_attachment.delete_failed",
            backend=storage.name,
            company_id=str(ctx.company_id),
            ticket_id=str(ticket.id),
            error_type=type(exc).__name__,
        )


def _assert_magic(raw: bytes, content_type: str) -> None:
    is_valid = {
        "image/jpeg": raw.startswith(b"\xff\xd8\xff"),
        "image/png": raw.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": len(raw) >= 12 and raw.startswith(b"RIFF") and raw[8:12] == b"WEBP",
        "application/pdf": raw.startswith(b"%PDF-"),
    }.get(content_type, False)
    if not is_valid:
        raise ConflictError("El contenido del archivo no coincide con su tipo declarado.")


def _ext_for_mime(content_type: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "application/pdf": ".pdf",
    }.get(content_type, ".bin")


# ── XLSX EXPORT ───────────────────────────────────────────────────────────────

_EXPENSE_HEADERS = [
    "ID",
    "Fecha compra",
    "Empleado",
    "Local",
    "Concepto",
    "Descripción",
    "Categoría",
    "Método de pago",
    "Importe",
    "Moneda",
    "Requiere reembolso",
    "Importe reembolso",
    "Estado",
    "Fecha aprobación",
    "Aprobado por",
    "Fecha pago",
    "Pagado por",
    "Motivo rechazo",
    "Notas internas",
    "Archivo adjunto",
]

_CATEGORY_LABELS = {
    "food": "Comida",
    "cleaning": "Limpieza",
    "supplies": "Suministros",
    "repair": "Reparación",
    "transport": "Transporte",
    "other": "Otro",
}

_PAYMENT_SOURCE_LABELS = {
    "personal_money": "Dinero personal",
    "company_account": "Cuenta empresa",
    "company_card": "Tarjeta empresa",
    "tips_pool": "Bote de propinas",
    "cash_register": "Caja",
    "other": "Otro",
}

_EXPENSE_STATUS_LABELS = {
    "pending": "Pendiente",
    "in_review": "En revisión",
    "approved": "Aprobado",
    "rejected": "Rechazado",
    "paid": "Pagado",
}


def _expense_enum_label(value: object | None, labels: dict[str, str]) -> str:
    if value is None:
        return ""
    raw = getattr(value, "value", value)
    return labels.get(str(raw), str(raw))


def _expense_decimal(value: object | None) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _build_expense_xlsx(*, company_name: str, tickets: list[ExpenseTicket]) -> bytes:
    kit = require_xlsx_kit("La exportación XLSX requiere el paquete openpyxl.")

    wb = kit.Workbook()
    ws = wb.active
    ws.title = "Gastos"
    prepare_worksheet(ws)

    last_column = len(_EXPENSE_HEADERS)
    next_row = write_report_title(
        ws,
        kit,
        title="ClockLy | Gastos",
        company_name=company_name,
        details=["Listado exportable de tickets de gasto"],
        last_column=last_column,
    )

    currencies = {ticket.currency for ticket in tickets if ticket.currency}
    currency_label = currencies.pop() if len(currencies) == 1 else "varias" if currencies else "EUR"
    total_amount = sum((_expense_decimal(ticket.amount) for ticket in tickets), Decimal("0"))
    reimbursement_amount = sum(
        (
            _expense_decimal(ticket.reimbursement_amount)
            for ticket in tickets
            if ticket.requires_reimbursement and ticket.status != ExpenseStatus.PAID
        ),
        Decimal("0"),
    )
    approved_amount = sum(
        (_expense_decimal(ticket.amount) for ticket in tickets if ticket.status == ExpenseStatus.APPROVED),
        Decimal("0"),
    )
    paid_amount = sum(
        (_expense_decimal(ticket.amount) for ticket in tickets if ticket.status == ExpenseStatus.PAID),
        Decimal("0"),
    )

    header_row = write_kpi_cards(
        ws,
        kit,
        start_row=next_row,
        last_column=last_column,
        metrics=[
            ("Gastos", str(len(tickets))),
            ("Importe total", f"{metric_number(float(total_amount))} {currency_label}"),
            ("Aprobado", f"{metric_number(float(approved_amount))} {currency_label}"),
            ("Pagado", f"{metric_number(float(paid_amount))} {currency_label}"),
        ],
    )
    if reimbursement_amount:
        current_details = ws.cell(row=3, column=1).value
        ws.cell(row=3, column=1).value = (
            f"{current_details} | Reembolso pendiente: {metric_number(float(reimbursement_amount))} {currency_label}"
        )

    write_table_header(ws, kit, header_row=header_row, headers=_EXPENSE_HEADERS)
    data_start_row = header_row + 1

    for row_idx, ticket in enumerate(tickets, start=data_start_row):
        employee_name = ticket.employee.full_name if ticket.employee else ""
        location_name = ticket.location.name if ticket.location else str(ticket.location_id) if ticket.location_id else ""
        approved_by = ticket.approved_by.full_name if ticket.approved_by else ""
        paid_by = ticket.paid_by.full_name if ticket.paid_by else ""
        values = [
            str(ticket.id),
            ticket.purchase_date,
            employee_name,
            location_name,
            ticket.title,
            ticket.description or "",
            _expense_enum_label(ticket.category, _CATEGORY_LABELS),
            _expense_enum_label(ticket.payment_source, _PAYMENT_SOURCE_LABELS),
            float(ticket.amount),
            ticket.currency,
            "Sí" if ticket.requires_reimbursement else "No",
            float(ticket.reimbursement_amount) if ticket.reimbursement_amount else "",
            _expense_enum_label(ticket.status, _EXPENSE_STATUS_LABELS),
            ticket.approved_at.date() if ticket.approved_at else None,
            approved_by,
            ticket.paid_at.date() if ticket.paid_at else None,
            paid_by,
            ticket.rejection_reason or "",
            ticket.internal_notes or "",
            ticket.attachment_file_name or "",
        ]
        for col, value in enumerate(values, start=1):
            ws.cell(row=row_idx, column=col, value=safe_spreadsheet_value(value))

    if not tickets:
        ws.cell(row=data_start_row, column=1, value=safe_spreadsheet_value("Sin gastos"))

    last_row = header_row + max(len(tickets), 1)
    style_table_body(
        ws,
        kit,
        first_row=data_start_row,
        last_row=last_row,
        last_column=last_column,
        center_columns={2, 7, 8, 10, 11, 13, 14, 16},
        wrap_columns={5, 6, 18, 19, 20},
    )
    for row_idx in range(data_start_row, last_row + 1):
        apply_status_style(ws.cell(row=row_idx, column=13), kit)
    for column in (2, 14, 16):
        set_number_format(ws, column=column, first_row=data_start_row, last_row=last_row, number_format=DATE_FORMAT)
    for column in (9, 12):
        set_number_format(ws, column=column, first_row=data_start_row, last_row=last_row, number_format=MONEY_FORMAT)

    set_column_widths(
        ws,
        kit,
        [38, 14, 24, 22, 30, 36, 16, 20, 13, 10, 18, 18, 14, 16, 24, 14, 24, 34, 34, 26],
    )
    ws.freeze_panes = f"A{data_start_row}"
    add_excel_table(
        ws,
        kit,
        name="ClockLyGastos",
        header_row=header_row,
        last_row=last_row,
        last_column=last_column,
    )

    total_row = last_row + 2
    ws.merge_cells(start_row=total_row, start_column=1, end_row=total_row, end_column=8)
    ws.cell(row=total_row, column=1, value=safe_spreadsheet_value("Total general"))
    ws.cell(row=total_row, column=9, value=float(total_amount))
    ws.cell(row=total_row, column=12, value=float(reimbursement_amount))
    for column in (1, 9, 12):
        cell = ws.cell(row=total_row, column=column)
        cell.font = kit.Font(bold=True, color="FFFFFF")
        cell.fill = kit.PatternFill("solid", fgColor="1D4ED8")
        cell.alignment = kit.Alignment(horizontal="center", vertical="center")
        if column in {9, 12}:
            cell.number_format = MONEY_FORMAT

    output = BytesIO()
    wb.save(output)
    return output.getvalue()
