from __future__ import annotations

import csv
import uuid
from collections import defaultdict
from datetime import UTC, date, datetime
from decimal import Decimal
from io import BytesIO, StringIO
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.core.timezones import tenant_zone
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.cash_closure import CashClosure, CashClosureCardTerminal, CashClosureDrawer
from app.models.company_location import CompanyLocation
from app.models.enums import CashClosureShift
from app.repositories.cash_closure_repository import CashClosureRepository
from app.schemas.cash_closure import (
    CashClosureChartsResponse,
    CashClosureCreate,
    CashClosureEmployeeIncidenceRank,
    CashClosureLineCreate,
    CashClosureListResponse,
    CashClosurePaymentMix,
    CashClosurePrefillResponse,
    CashClosureRead,
    CashClosureRevenuePoint,
    CashClosureStats,
    CashClosureUpdate,
)
from app.services.audit_log import AuditLogService
from app.services.xlsx_report import (
    MONEY_FORMAT,
    add_excel_table,
    prepare_worksheet,
    require_xlsx_kit,
    set_column_widths,
    style_table_body,
    write_kpi_cards,
    write_report_title,
    write_table_header,
)

router = APIRouter(prefix="/cash-closures", tags=["cash-closures"])

MoneyType = Literal["all", "cash", "card"]
PeriodType = Literal["day", "week", "month"]
ExportFormat = Literal["xlsx", "csv"]

MONEY_ZERO = Decimal("0.00")
CENT = Decimal("0.01")


@router.get("", response_model=CashClosureListResponse)
def list_cash_closures(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    shift: CashClosureShift | None = Query(default=None),
    closed_by_user_id: UUID | None = Query(default=None),
    location_id: UUID | None = Query(default=None),
    has_incidence: bool | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("cash_closures:read")),
    db: Session = Depends(get_db),
) -> CashClosureListResponse:
    repo = CashClosureRepository(db, company_id=ctx.company_id)
    filter_kwargs = dict(
        date_from=date_from,
        date_to=date_to,
        shift=shift,
        closed_by_user_id=closed_by_user_id,
        location_id=location_id,
        has_incidence=has_incidence,
    )
    items = repo.list(**filter_kwargs, limit=limit, offset=offset)
    total = repo.count(**filter_kwargs)
    return CashClosureListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/prefill", response_model=CashClosurePrefillResponse)
def prefill_cash_closure(
    closure_date: date | None = Query(default=None, alias="date"),
    shift: CashClosureShift = Query(default=CashClosureShift.MORNING),
    location_id: UUID | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("cash_closures:write")),
    db: Session = Depends(get_db),
) -> CashClosurePrefillResponse:
    _assert_location_belongs_to_company(db, ctx.company_id, location_id)
    local_date = closure_date or datetime.now(tenant_zone(ctx.company.timezone)).date()
    return CashClosurePrefillResponse(
        date=local_date,
        shift=shift,
        location_id=location_id,
        source="manual",
        supports_external_sales=False,
        theoretical_total=MONEY_ZERO,
        real_total=MONEY_ZERO,
        cash_drawers=[
            CashClosureLineCreate(name="Cajon 1", amount=MONEY_ZERO),
        ],
        card_terminals=[
            CashClosureLineCreate(name="TPV 1", amount=MONEY_ZERO),
        ],
    )


@router.get("/stats", response_model=CashClosureStats)
def cash_closure_stats(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    shift: CashClosureShift | None = Query(default=None),
    closed_by_user_id: UUID | None = Query(default=None),
    location_id: UUID | None = Query(default=None),
    payment_type: MoneyType = Query(default="all"),
    ctx: TenantContext = Depends(require_permission("cash_closures:analytics")),
    db: Session = Depends(get_db),
) -> CashClosureStats:
    closures = _reporting_closures(
        db,
        ctx,
        date_from=date_from,
        date_to=date_to,
        shift=shift,
        closed_by_user_id=closed_by_user_id,
        location_id=location_id,
    )
    rows = [_selected_totals(closure, payment_type) for closure in closures]
    closure_count = len(closures)
    total_theoretical = _sum(row["theoretical_total"] for row in rows)
    total_real = _sum(row["real_total"] for row in rows)
    total_balance = _sum(row["balance"] for row in rows)
    cash_total = _sum(row["cash_real"] for row in rows)
    card_total = _sum(row["card_real"] for row in rows)
    incidence_rows = [row for row in rows if row["balance"] != MONEY_ZERO]
    return CashClosureStats(
        closure_count=closure_count,
        total_theoretical=total_theoretical,
        total_real=total_real,
        total_balance=total_balance,
        cash_total=cash_total,
        card_total=card_total,
        incidence_count=len(incidence_rows),
        incidence_amount_total=_sum(abs(row["balance"]) for row in incidence_rows),
        avg_real_total=_money(total_real / closure_count) if closure_count else MONEY_ZERO,
    )


@router.get("/charts", response_model=CashClosureChartsResponse)
def cash_closure_charts(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    shift: CashClosureShift | None = Query(default=None),
    closed_by_user_id: UUID | None = Query(default=None),
    location_id: UUID | None = Query(default=None),
    payment_type: MoneyType = Query(default="all"),
    period: PeriodType = Query(default="day"),
    ctx: TenantContext = Depends(require_permission("cash_closures:analytics")),
    db: Session = Depends(get_db),
) -> CashClosureChartsResponse:
    closures = _reporting_closures(
        db,
        ctx,
        date_from=date_from,
        date_to=date_to,
        shift=shift,
        closed_by_user_id=closed_by_user_id,
        location_id=location_id,
    )
    period_rows = _aggregate_by_period(closures, payment_type=payment_type, period=period)
    return CashClosureChartsResponse(
        revenue_by_period=period_rows,
        theoretical_vs_real=period_rows,
        balance_evolution=period_rows,
        payment_mix=CashClosurePaymentMix(
            cash_total=_sum(_selected_totals(c, payment_type)["cash_real"] for c in closures),
            card_total=_sum(_selected_totals(c, payment_type)["card_real"] for c in closures),
        ),
        top_incidence_users=_top_incidence_users(closures, payment_type=payment_type),
    )


@router.get("/export")
def export_cash_closures(
    export_format: ExportFormat = Query(default="xlsx", alias="format"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    shift: CashClosureShift | None = Query(default=None),
    closed_by_user_id: UUID | None = Query(default=None),
    location_id: UUID | None = Query(default=None),
    has_incidence: bool | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("cash_closures:export")),
    db: Session = Depends(get_db),
) -> Response:
    closures = _reporting_closures(
        db,
        ctx,
        date_from=date_from,
        date_to=date_to,
        shift=shift,
        closed_by_user_id=closed_by_user_id,
        location_id=location_id,
        has_incidence=has_incidence,
    )
    timestamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    if export_format == "csv":
        content = _build_csv(closures)
        return Response(
            content=content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="clockly-cierres-caja-{timestamp}.csv"'},
        )

    content = _build_xlsx(company_name=ctx.company.name, closures=closures)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="clockly-cierres-caja-{timestamp}.xlsx"'},
    )


@router.get("/{closure_id}", response_model=CashClosureRead)
def get_cash_closure(
    closure_id: UUID,
    ctx: TenantContext = Depends(require_permission("cash_closures:read")),
    db: Session = Depends(get_db),
) -> CashClosureRead:
    closure = CashClosureRepository(db, company_id=ctx.company_id).get(closure_id)
    if closure is None:
        raise NotFoundError("Cierre de caja no encontrado.")
    return closure


@router.post("", response_model=CashClosureRead, status_code=status.HTTP_201_CREATED)
def create_cash_closure(
    payload: CashClosureCreate,
    ctx: TenantContext = Depends(require_permission("cash_closures:write")),
    db: Session = Depends(get_db),
) -> CashClosureRead:
    _assert_location_belongs_to_company(db, ctx.company_id, payload.location_id)
    local_date = payload.date or datetime.now(tenant_zone(ctx.company.timezone)).date()
    now = datetime.now(UTC)
    totals = _calculate_totals(
        theoretical_total=payload.theoretical_total,
        real_total=payload.real_total,
        cash_drawers=payload.cash_drawers,
        card_terminals=payload.card_terminals,
    )
    _assert_incidence_comment(totals["balance"], payload.incidence_comment)

    closure = CashClosure(
        id=uuid.uuid4(),
        company_id=ctx.company_id,
        location_id=payload.location_id,
        closed_by_user_id=ctx.user.id,
        date=local_date,
        shift=payload.shift,
        custom_shift_name=payload.custom_shift_name,
        notes=payload.notes,
        theoretical_total=totals["theoretical_total"],
        real_total=totals["real_total"],
        balance=totals["balance"],
        has_incidence=totals["has_incidence"],
        incidence_amount=totals["balance"] if totals["has_incidence"] else MONEY_ZERO,
        incidence_comment=payload.incidence_comment,
        signature_name=ctx.user.full_name,
        signed_at=now,
        locked_at=now,
        cash_drawers=_make_drawers(payload.cash_drawers),
        card_terminals=_make_card_terminals(payload.card_terminals),
    )
    CashClosureRepository(db, company_id=ctx.company_id).add(closure)
    AuditLogService(db).record(
        "cash_closures.created",
        company_id=ctx.company_id,
        actor_user_id=ctx.user.id,
        resource_type="cash_closure",
        resource_id=str(closure.id),
        metadata={
            "date": str(local_date),
            "shift": payload.shift.value,
            "balance": str(totals["balance"]),
            "has_incidence": totals["has_incidence"],
        },
    )
    db.commit()
    return CashClosureRepository(db, company_id=ctx.company_id).get(closure.id) or closure


@router.patch("/{closure_id}", response_model=CashClosureRead)
def update_cash_closure(
    closure_id: UUID,
    payload: CashClosureUpdate,
    ctx: TenantContext = Depends(require_permission("cash_closures:manage")),
    db: Session = Depends(get_db),
) -> CashClosureRead:
    repo = CashClosureRepository(db, company_id=ctx.company_id)
    closure = repo.get(closure_id)
    if closure is None:
        raise NotFoundError("Cierre de caja no encontrado.")

    update_data = payload.model_dump(exclude_unset=True)
    location_supplied = "location_id" in update_data
    if location_supplied:
        _assert_location_belongs_to_company(db, ctx.company_id, payload.location_id)
        closure.location_id = payload.location_id
    if "date" in update_data and payload.date is not None:
        closure.date = payload.date
    if "shift" in update_data and payload.shift is not None:
        closure.shift = payload.shift
    if "custom_shift_name" in update_data:
        closure.custom_shift_name = payload.custom_shift_name
    if closure.shift == CashClosureShift.CUSTOM and not (closure.custom_shift_name or "").strip():
        raise ConflictError("custom_shift_name es obligatorio para turno personalizado.")
    if "notes" in update_data:
        closure.notes = payload.notes
    if "incidence_comment" in update_data:
        closure.incidence_comment = payload.incidence_comment

    lines_changed = payload.cash_drawers is not None or payload.card_terminals is not None
    totals_changed = "theoretical_total" in update_data or "real_total" in update_data

    if payload.cash_drawers is not None:
        closure.cash_drawers = _make_drawers(payload.cash_drawers)
    if payload.card_terminals is not None:
        closure.card_terminals = _make_card_terminals(payload.card_terminals)

    if not closure.cash_drawers and not closure.card_terminals:
        raise ConflictError("El cierre necesita al menos un cajon o datafono.")

    if totals_changed:
        theoretical_total = payload.theoretical_total if payload.theoretical_total is not None else closure.theoretical_total
        real_total = payload.real_total if payload.real_total is not None else closure.real_total
    elif lines_changed:
        theoretical_total = None
        real_total = None
    else:
        theoretical_total = closure.theoretical_total
        real_total = closure.real_total

    totals = _calculate_totals(
        theoretical_total=theoretical_total,
        real_total=real_total,
        cash_drawers=[
            CashClosureLineCreate(
                name=line.name,
                amount=line.real_amount,
                theoretical_amount=line.theoretical_amount,
                real_amount=line.real_amount,
            )
            for line in closure.cash_drawers
        ],
        card_terminals=[
            CashClosureLineCreate(
                name=line.name,
                amount=line.real_amount,
                theoretical_amount=line.theoretical_amount,
                real_amount=line.real_amount,
            )
            for line in closure.card_terminals
        ],
    )
    _assert_incidence_comment(totals["balance"], closure.incidence_comment)

    closure.theoretical_total = totals["theoretical_total"]
    closure.real_total = totals["real_total"]
    closure.balance = totals["balance"]
    closure.has_incidence = totals["has_incidence"]
    closure.incidence_amount = totals["balance"] if totals["has_incidence"] else MONEY_ZERO
    closure.last_edited_by_user_id = ctx.user.id
    closure.last_edited_at = datetime.now(UTC)

    AuditLogService(db).record(
        "cash_closures.updated",
        company_id=ctx.company_id,
        actor_user_id=ctx.user.id,
        resource_type="cash_closure",
        resource_id=str(closure.id),
        metadata={
            "balance": str(closure.balance),
            "has_incidence": closure.has_incidence,
        },
    )
    db.add(closure)
    db.commit()
    return repo.get(closure.id) or closure


def _assert_location_belongs_to_company(db: Session, company_id: UUID, location_id: UUID | None) -> None:
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


def _assert_incidence_comment(balance: Decimal, incidence_comment: str | None) -> None:
    if balance != MONEY_ZERO and not (incidence_comment or "").strip():
        raise ConflictError("El comentario de incidencia es obligatorio cuando el cierre no cuadra.")


def _make_drawers(lines: list[CashClosureLineCreate]) -> list[CashClosureDrawer]:
    return [
        CashClosureDrawer(
            id=uuid.uuid4(),
            name=line.name.strip(),
            theoretical_amount=_money(line.theoretical_amount),
            real_amount=_line_amount(line),
            sort_order=index,
        )
        for index, line in enumerate(lines)
    ]


def _make_card_terminals(lines: list[CashClosureLineCreate]) -> list[CashClosureCardTerminal]:
    return [
        CashClosureCardTerminal(
            id=uuid.uuid4(),
            name=line.name.strip(),
            theoretical_amount=_money(line.theoretical_amount),
            real_amount=_line_amount(line),
            sort_order=index,
        )
        for index, line in enumerate(lines)
    ]


def _calculate_totals(
    *,
    theoretical_total: Decimal | None,
    real_total: Decimal | None,
    cash_drawers: list[CashClosureLineCreate],
    card_terminals: list[CashClosureLineCreate],
) -> dict[str, Decimal | bool]:
    if theoretical_total is None or real_total is None:
        theoretical = _sum(_line_theoretical(line) for line in cash_drawers)
        theoretical += _sum(_line_theoretical(line) for line in card_terminals)
        real = _sum(_line_amount(line) for line in cash_drawers)
        real += _sum(_line_amount(line) for line in card_terminals)
    else:
        theoretical = _money(theoretical_total)
        real = _money(real_total)
    balance = _money(real - theoretical)
    return {
        "theoretical_total": _money(theoretical),
        "real_total": _money(real),
        "balance": balance,
        "has_incidence": balance != MONEY_ZERO,
    }


def _reporting_closures(
    db: Session,
    ctx: TenantContext,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    shift: CashClosureShift | None = None,
    closed_by_user_id: UUID | None = None,
    location_id: UUID | None = None,
    has_incidence: bool | None = None,
) -> list[CashClosure]:
    return CashClosureRepository(db, company_id=ctx.company_id).list_for_reporting(
        date_from=date_from,
        date_to=date_to,
        shift=shift,
        closed_by_user_id=closed_by_user_id,
        location_id=location_id,
        has_incidence=has_incidence,
    )


def _selected_totals(closure: CashClosure, payment_type: MoneyType) -> dict[str, Decimal]:
    cash_theoretical = _sum(line.theoretical_amount for line in closure.cash_drawers)
    cash_real = _sum(line.real_amount for line in closure.cash_drawers)
    card_theoretical = _sum(line.theoretical_amount for line in closure.card_terminals)
    card_real = _sum(line.real_amount for line in closure.card_terminals)

    if payment_type == "cash":
        theoretical_total = cash_real
        real_total = cash_real
        balance = closure.balance
    elif payment_type == "card":
        theoretical_total = card_real
        real_total = card_real
        balance = closure.balance
    else:
        theoretical_total = closure.theoretical_total
        real_total = closure.real_total
        balance = closure.balance

    return {
        "cash_theoretical": _money(cash_theoretical),
        "cash_real": _money(cash_real),
        "card_theoretical": _money(card_theoretical),
        "card_real": _money(card_real),
        "theoretical_total": _money(theoretical_total),
        "real_total": _money(real_total),
        "balance": _money(balance),
    }


def _aggregate_by_period(
    closures: list[CashClosure],
    *,
    payment_type: MoneyType,
    period: PeriodType,
) -> list[CashClosureRevenuePoint]:
    grouped: dict[str, dict[str, Decimal | int]] = defaultdict(
        lambda: {
            "theoretical_total": MONEY_ZERO,
            "real_total": MONEY_ZERO,
            "cash_total": MONEY_ZERO,
            "card_total": MONEY_ZERO,
            "balance": MONEY_ZERO,
            "incidence_count": 0,
        }
    )
    for closure in closures:
        label = _period_label(closure.date, period)
        totals = _selected_totals(closure, payment_type)
        grouped[label]["theoretical_total"] += totals["theoretical_total"]  # type: ignore[operator]
        grouped[label]["real_total"] += totals["real_total"]  # type: ignore[operator]
        grouped[label]["cash_total"] += totals["cash_real"]  # type: ignore[operator]
        grouped[label]["card_total"] += totals["card_real"]  # type: ignore[operator]
        grouped[label]["balance"] += totals["balance"]  # type: ignore[operator]
        if totals["balance"] != MONEY_ZERO:
            grouped[label]["incidence_count"] += 1  # type: ignore[operator]

    return [
        CashClosureRevenuePoint(
            label=label,
            theoretical_total=_money(values["theoretical_total"]),
            real_total=_money(values["real_total"]),
            cash_total=_money(values["cash_total"]),
            card_total=_money(values["card_total"]),
            balance=_money(values["balance"]),
            incidence_count=int(values["incidence_count"]),
        )
        for label, values in sorted(grouped.items())
    ]


def _top_incidence_users(
    closures: list[CashClosure],
    *,
    payment_type: MoneyType,
) -> list[CashClosureEmployeeIncidenceRank]:
    grouped: dict[str, dict[str, object]] = {}
    for closure in closures:
        key = str(closure.closed_by_user_id) if closure.closed_by_user_id else "unknown"
        entry = grouped.setdefault(
            key,
            {
                "user_id": closure.closed_by_user_id,
                "user_name": closure.closed_by.full_name if closure.closed_by else closure.signature_name,
                "closure_count": 0,
                "incidence_count": 0,
                "incidence_amount": MONEY_ZERO,
            },
        )
        entry["closure_count"] = int(entry["closure_count"]) + 1
        balance = _selected_totals(closure, payment_type)["balance"]
        if balance != MONEY_ZERO:
            entry["incidence_count"] = int(entry["incidence_count"]) + 1
            entry["incidence_amount"] = _money(entry["incidence_amount"]) + abs(balance)

    rows = [
        CashClosureEmployeeIncidenceRank(
            user_id=entry["user_id"],
            user_name=str(entry["user_name"]),
            closure_count=int(entry["closure_count"]),
            incidence_count=int(entry["incidence_count"]),
            incidence_amount=_money(entry["incidence_amount"]),
        )
        for entry in grouped.values()
        if int(entry["incidence_count"]) > 0
    ]
    return sorted(rows, key=lambda row: (row.incidence_count, row.incidence_amount), reverse=True)[:10]


def _period_label(value: date, period: PeriodType) -> str:
    if period == "month":
        return f"{value.year:04d}-{value.month:02d}"
    if period == "week":
        iso = value.isocalendar()
        return f"{iso.year:04d}-W{iso.week:02d}"
    return value.isoformat()


def _line_detail(lines) -> str:
    return " | ".join(
        f"{line.name}: importe {_money(line.real_amount)}"
        for line in lines
    )


def _shift_label(closure: CashClosure) -> str:
    labels = {
        CashClosureShift.MORNING: "Manana",
        CashClosureShift.AFTERNOON: "Tarde",
        CashClosureShift.NIGHT: "Noche",
        CashClosureShift.CUSTOM: closure.custom_shift_name or "Personalizado",
    }
    return labels[closure.shift]


def _build_csv(closures: list[CashClosure]) -> str:
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Fecha",
            "Turno",
            "Usuario",
            "Local",
            "Total teorico",
            "Total real",
            "Balance",
            "Incidencia",
            "Comentario incidencia",
            "Detalle por cajon",
            "Detalle por datafono",
            "Firma",
            "Fecha firma",
        ]
    )
    for closure in closures:
        writer.writerow(
            [
                closure.date.isoformat(),
                _shift_label(closure),
                closure.closed_by.full_name if closure.closed_by else closure.signature_name,
                closure.location.name if closure.location else "",
                str(_money(closure.theoretical_total)),
                str(_money(closure.real_total)),
                str(_money(closure.balance)),
                "Si" if closure.has_incidence else "No",
                closure.incidence_comment or "",
                _line_detail(closure.cash_drawers),
                _line_detail(closure.card_terminals),
                closure.signature_name,
                closure.signed_at.isoformat(),
            ]
        )
    return output.getvalue()


def _build_xlsx(*, company_name: str, closures: list[CashClosure]) -> bytes:
    kit = require_xlsx_kit("La exportacion XLSX requiere el paquete openpyxl.")
    wb = kit.Workbook()
    ws = wb.active
    ws.title = "Cierres de caja"
    prepare_worksheet(ws)

    headers = [
        "Fecha",
        "Turno",
        "Usuario",
        "Local",
        "Total teorico",
        "Total real",
        "Balance",
        "Incidencia",
        "Comentario incidencia",
        "Detalle por cajon",
        "Detalle por datafono",
        "Firma",
        "Fecha firma",
    ]
    next_row = write_report_title(
        ws,
        kit,
        title="ClockLy | Cierres de caja",
        company_name=company_name,
        details=["Control diario de efectivo, datafonos e incidencias"],
        last_column=len(headers),
    )
    header_row = write_kpi_cards(
        ws,
        kit,
        start_row=next_row,
        last_column=len(headers),
        metrics=[
            ("Cierres", str(len(closures))),
            ("Total real", str(_sum(c.real_total for c in closures))),
            ("Balance", str(_sum(c.balance for c in closures))),
            ("Incidencias", str(sum(1 for c in closures if c.has_incidence))),
        ],
    )
    write_table_header(ws, kit, header_row=header_row, headers=headers)
    data_start_row = header_row + 1

    for row_idx, closure in enumerate(closures, start=data_start_row):
        values = [
            closure.date,
            _shift_label(closure),
            closure.closed_by.full_name if closure.closed_by else closure.signature_name,
            closure.location.name if closure.location else "",
            float(_money(closure.theoretical_total)),
            float(_money(closure.real_total)),
            float(_money(closure.balance)),
            "Si" if closure.has_incidence else "No",
            closure.incidence_comment or "",
            _line_detail(closure.cash_drawers),
            _line_detail(closure.card_terminals),
            closure.signature_name,
            closure.signed_at.replace(tzinfo=None) if closure.signed_at else None,
        ]
        for col, value in enumerate(values, start=1):
            ws.cell(row=row_idx, column=col, value=value)

    if not closures:
        ws.cell(row=data_start_row, column=1, value="Sin cierres")

    last_row = header_row + max(len(closures), 1)
    style_table_body(
        ws,
        kit,
        first_row=data_start_row,
        last_row=last_row,
        last_column=len(headers),
        center_columns={1, 2, 8, 13},
        wrap_columns={9, 10, 11},
    )
    for column in (5, 6, 7):
        for row_idx in range(data_start_row, last_row + 1):
            ws.cell(row=row_idx, column=column).number_format = MONEY_FORMAT
    set_column_widths(ws, kit, [14, 14, 26, 22, 15, 15, 13, 12, 34, 44, 44, 24, 21])
    add_excel_table(
        ws,
        kit,
        name="ClockLyCierresCaja",
        header_row=header_row,
        last_row=last_row,
        last_column=len(headers),
    )
    ws.freeze_panes = f"A{data_start_row}"

    output = BytesIO()
    wb.save(output)
    return output.getvalue()


def _sum(values) -> Decimal:
    total = MONEY_ZERO
    for value in values:
        total += _money(value)
    return _money(total)


def _money(value) -> Decimal:
    if value is None:
        return MONEY_ZERO
    if isinstance(value, Decimal):
        return value.quantize(CENT)
    return Decimal(str(value)).quantize(CENT)


def _line_amount(line: CashClosureLineCreate) -> Decimal:
    return _money(line.amount if line.amount is not None else line.real_amount)


def _line_theoretical(line: CashClosureLineCreate) -> Decimal:
    return _money(line.theoretical_amount)
