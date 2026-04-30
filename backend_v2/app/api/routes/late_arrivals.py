"""Late arrivals (retrasos) API routes."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from io import BytesIO
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, PermissionDenied
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.enums import LateArrivalStatus, UserRole
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.late_arrival_repository import LateArrivalRepository
from app.schemas.late_arrival import (
    LateArrivalChartsResponse,
    LateArrivalListResponse,
    LateArrivalRead,
    LateArrivalStats,
    LateArrivalUpdateStatus,
)
from app.services.xlsx_report import (
    DATE_FORMAT,
    TIME_FORMAT,
    add_excel_table,
    apply_status_style,
    metric_number,
    prepare_worksheet,
    require_xlsx_kit,
    set_column_widths,
    set_number_format,
    style_table_body,
    write_kpi_cards,
    write_report_title,
    write_table_header,
)

router = APIRouter(prefix="/late-arrivals", tags=["late-arrivals"])


def _own_employee_id(db: Session, ctx: TenantContext) -> UUID | None:
    own = EmployeeRepository(db, company_id=ctx.company_id).get_by_user_id(ctx.user.id)
    return own.id if own else None


def _get_and_scope(late_arrival_id: UUID, db: Session, ctx: TenantContext):
    record = LateArrivalRepository(db, company_id=ctx.company_id).get(late_arrival_id)
    if record is None:
        raise NotFoundError("Retraso no encontrado.")
    if ctx.user.role == UserRole.EMPLOYEE:
        own_id = _own_employee_id(db, ctx)
        if record.employee_id != own_id:
            raise PermissionDenied("No tienes permiso para ver este retraso.")
    return record


# ── LIST ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=LateArrivalListResponse)
def list_late_arrivals(
    employee_id: UUID | None = Query(default=None),
    late_status: LateArrivalStatus | None = Query(default=None, alias="status"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    min_delay_minutes: int | None = Query(default=None, ge=1),
    max_delay_minutes: int | None = Query(default=None, ge=1),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("late_arrivals:read")),
    db: Session = Depends(get_db),
) -> LateArrivalListResponse:
    from datetime import date as date_type

    if ctx.user.role == UserRole.EMPLOYEE:
        employee_id = _own_employee_id(db, ctx)
        if employee_id is None:
            return LateArrivalListResponse(items=[], total=0, limit=limit, offset=offset)

    date_from_parsed = date_type.fromisoformat(date_from) if date_from else None
    date_to_parsed = date_type.fromisoformat(date_to) if date_to else None

    repo = LateArrivalRepository(db, company_id=ctx.company_id)
    filter_kwargs = dict(
        employee_id=employee_id,
        status=late_status,
        date_from=date_from_parsed,
        date_to=date_to_parsed,
        min_delay_minutes=min_delay_minutes,
        max_delay_minutes=max_delay_minutes,
    )
    items = repo.list(**filter_kwargs, limit=limit, offset=offset)
    total = repo.count(**filter_kwargs)
    return LateArrivalListResponse(items=items, total=total, limit=limit, offset=offset)


# ── STATS ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=LateArrivalStats)
def get_late_arrival_stats(
    employee_id: UUID | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("late_arrivals:read")),
    db: Session = Depends(get_db),
) -> LateArrivalStats:
    from datetime import date as date_type

    if ctx.user.role == UserRole.EMPLOYEE:
        employee_id = _own_employee_id(db, ctx)

    date_from_parsed = date_type.fromisoformat(date_from) if date_from else None
    date_to_parsed = date_type.fromisoformat(date_to) if date_to else None

    data = LateArrivalRepository(db, company_id=ctx.company_id).stats(
        employee_id=employee_id,
        date_from=date_from_parsed,
        date_to=date_to_parsed,
    )
    return LateArrivalStats(**data)


# ── CHARTS ────────────────────────────────────────────────────────────────────

@router.get("/charts", response_model=LateArrivalChartsResponse)
def get_late_arrival_charts(
    employee_id: UUID | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("late_arrivals:read")),
    db: Session = Depends(get_db),
) -> LateArrivalChartsResponse:
    from datetime import date as date_type

    if ctx.user.role == UserRole.EMPLOYEE:
        employee_id = _own_employee_id(db, ctx)

    date_from_parsed = date_type.fromisoformat(date_from) if date_from else None
    date_to_parsed = date_type.fromisoformat(date_to) if date_to else None

    repo = LateArrivalRepository(db, company_id=ctx.company_id)
    by_day = repo.chart_by_day(employee_id=employee_id, date_from=date_from_parsed, date_to=date_to_parsed)
    by_month = repo.chart_by_month(employee_id=employee_id, date_from=date_from_parsed, date_to=date_to_parsed)
    top_employees = repo.top_employees(date_from=date_from_parsed, date_to=date_to_parsed)

    # Build weekday distribution from the by_day data (Mon–Sun)
    weekday_buckets: dict[int, dict] = {
        i: {"label": label, "count": 0, "total_minutes": 0}
        for i, label in enumerate(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"])
    }
    for point in by_day:
        from datetime import date as date_type2
        d = date_type2.fromisoformat(point["label"])
        wd = d.weekday()
        weekday_buckets[wd]["count"] += point["count"]
        weekday_buckets[wd]["total_minutes"] += point["total_minutes"]

    return LateArrivalChartsResponse(
        by_day=by_day,
        by_weekday=list(weekday_buckets.values()),
        by_month=by_month,
        top_employees=top_employees,
    )


# ── EXPORT ────────────────────────────────────────────────────────────────────

@router.get("/export")
def export_late_arrivals(
    export_format: Literal["xlsx"] = Query(default="xlsx", alias="format"),
    employee_id: UUID | None = Query(default=None),
    late_status: LateArrivalStatus | None = Query(default=None, alias="status"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("late_arrivals:export")),
    db: Session = Depends(get_db),
) -> Response:
    from datetime import date as date_type

    date_from_parsed = date_type.fromisoformat(date_from) if date_from else None
    date_to_parsed = date_type.fromisoformat(date_to) if date_to else None

    records = LateArrivalRepository(db, company_id=ctx.company_id).list_for_export(
        employee_id=employee_id,
        status=late_status,
        date_from=date_from_parsed,
        date_to=date_to_parsed,
    )
    content = _build_xlsx(company_name=ctx.company.name, records=records)
    filename = f"clockly-retrasos-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── GET ONE ───────────────────────────────────────────────────────────────────

@router.get("/{late_arrival_id}", response_model=LateArrivalRead)
def get_late_arrival(
    late_arrival_id: UUID,
    ctx: TenantContext = Depends(require_permission("late_arrivals:read")),
    db: Session = Depends(get_db),
) -> LateArrivalRead:
    return _get_and_scope(late_arrival_id, db, ctx)


# ── UPDATE STATUS ─────────────────────────────────────────────────────────────

@router.patch("/{late_arrival_id}/status", response_model=LateArrivalRead)
def update_late_arrival_status(
    late_arrival_id: UUID,
    payload: LateArrivalUpdateStatus,
    ctx: TenantContext = Depends(require_permission("late_arrivals:manage")),
    db: Session = Depends(get_db),
) -> LateArrivalRead:
    # Employees cannot manage late arrivals (only view their own).
    if ctx.user.role == UserRole.EMPLOYEE:
        raise PermissionDenied("Los empleados no pueden cambiar el estado de un retraso.")

    record = LateArrivalRepository(db, company_id=ctx.company_id).get(late_arrival_id)
    if record is None:
        raise NotFoundError("Retraso no encontrado.")

    now = datetime.now(UTC)
    record.status = payload.status
    record.reviewed_by_user_id = ctx.user.id
    record.reviewed_at = now
    if payload.justification_text is not None:
        record.justification_text = payload.justification_text
    if payload.internal_notes is not None:
        record.internal_notes = payload.internal_notes

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── XLSX REPORT ───────────────────────────────────────────────────────────────

_STATUS_LABELS = {
    "pending": "Pendiente",
    "justified": "Justificado",
    "unjustified": "No justificado",
    "ignored": "Ignorado",
}

_METHOD_LABELS = {
    "web": "Web",
    "mobile": "Móvil",
    "kiosk": "Kiosco",
    "pin": "PIN",
}

_HEADERS = [
    "ID",
    "Empleado",
    "Fecha",
    "Hora prevista",
    "Hora real",
    "Min. retraso total",
    "Min. tras margen",
    "Margen (min)",
    "Estado",
    "Justificación",
    "Notas internas",
    "Revisado por",
    "Fecha revisión",
    "Método fichaje",
]


def _label(value, mapping: dict) -> str:
    if value is None:
        return ""
    raw = getattr(value, "value", value)
    return mapping.get(str(raw), str(raw))


def _build_xlsx(*, company_name: str, records) -> bytes:
    kit = require_xlsx_kit("La exportación XLSX requiere openpyxl.")
    wb = kit.Workbook()
    ws = wb.active
    ws.title = "Retrasos"
    prepare_worksheet(ws)

    last_column = len(_HEADERS)
    next_row = write_report_title(
        ws, kit,
        title="ClockLy | Retrasos",
        company_name=company_name,
        details=["Listado exportable de retrasos de entrada"],
        last_column=last_column,
    )

    total_delay = sum(r.delay_minutes_total for r in records)
    pending_count = sum(1 for r in records if r.status == LateArrivalStatus.PENDING)
    unjustified_count = sum(1 for r in records if r.status == LateArrivalStatus.UNJUSTIFIED)

    header_row = write_kpi_cards(
        ws, kit,
        start_row=next_row,
        last_column=last_column,
        metrics=[
            ("Retrasos", str(len(records))),
            ("Min. totales", str(total_delay)),
            ("Pendientes", str(pending_count)),
            ("No justificados", str(unjustified_count)),
        ],
    )

    write_table_header(ws, kit, header_row=header_row, headers=_HEADERS)
    data_start_row = header_row + 1

    for row_idx, rec in enumerate(records, start=data_start_row):
        employee_name = rec.employee.full_name if rec.employee else ""
        reviewed_by_name = rec.reviewed_by.full_name if rec.reviewed_by else ""
        values = [
            str(rec.id),
            employee_name,
            rec.date,
            rec.scheduled_start_time,
            rec.actual_clock_in_time,
            rec.delay_minutes_total,
            rec.delay_minutes_after_grace,
            rec.grace_period_minutes,
            _label(rec.status, _STATUS_LABELS),
            rec.justification_text or "",
            rec.internal_notes or "",
            reviewed_by_name,
            rec.reviewed_at.date() if rec.reviewed_at else None,
            _label(rec.clock_in_method, _METHOD_LABELS),
        ]
        for col, value in enumerate(values, start=1):
            ws.cell(row=row_idx, column=col, value=value)

    if not records:
        ws.cell(row=data_start_row, column=1, value="Sin retrasos")

    last_row = header_row + max(len(records), 1)
    style_table_body(
        ws, kit,
        first_row=data_start_row,
        last_row=last_row,
        last_column=last_column,
        center_columns={3, 4, 5, 6, 7, 8, 9, 13, 14},
        wrap_columns={10, 11},
    )
    for row_idx in range(data_start_row, last_row + 1):
        apply_status_style(ws.cell(row=row_idx, column=9), kit)
    for column in (3, 13):
        set_number_format(ws, column=column, first_row=data_start_row, last_row=last_row, number_format=DATE_FORMAT)
    for column in (4, 5):
        set_number_format(ws, column=column, first_row=data_start_row, last_row=last_row, number_format=TIME_FORMAT)

    set_column_widths(ws, kit, [38, 26, 14, 13, 13, 18, 18, 14, 16, 36, 30, 26, 16, 16])
    ws.freeze_panes = f"A{data_start_row}"
    add_excel_table(
        ws, kit,
        name="ClockLyRetrasos",
        header_row=header_row,
        last_row=last_row,
        last_column=last_column,
    )

    output = BytesIO()
    wb.save(output)
    return output.getvalue()
