from __future__ import annotations

import calendar
import csv as csv_module
from datetime import UTC, date, datetime, time
from io import BytesIO
from io import StringIO
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from sqlalchemy import func, select

from app.core.errors import ConflictError
from app.core.timezones import to_tenant_timezone
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.attendance_session import AttendanceSession
from app.models.employee import Employee
from app.models.enums import AttendanceStatus, ClockOutSource
from app.models.late_arrival import LateArrival
from app.services.export_service import ExportService
from app.services.plans import check_plan_feature
from app.services.salary_service import SalaryService
from app.services.xlsx_report import (
    DATE_FORMAT,
    MONEY_FORMAT,
    NUMBER_FORMAT,
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


router = APIRouter(prefix="/exports", tags=["exports"])


HEADERS = [
    "Empleado",
    "DNI / ID",
    "Fecha entrada",
    "Hora entrada",
    "Fecha salida",
    "Hora salida",
    "Duración (hh:mm)",
    "Estado",
    "Origen salida",
    "Incidencia",
    "Notas",
]

ATTENDANCE_STATUS_LABELS = {
    "open": "Abierto",
    "closed": "Cerrado",
    "void": "Anulado",
}

CLOCK_OUT_SOURCE_LABELS = {
    "employee": "Empleado",
    "admin": "Admin",
    "manual": "Manual",
    "auto": "Automático",
}

SALARY_TYPE_LABELS = {
    "hourly": "Por hora",
    "daily": "Por día",
    "shift": "Por turno",
    "monthly": "Mensual",
    "weekly": "Semanal",
}


@router.get("/attendance")
def export_attendance(
    export_format: Literal["csv", "excel", "xlsx", "pdf"] = Query(default="xlsx", alias="format"),
    employee_id: UUID | None = Query(default=None),
    status: AttendanceStatus | None = Query(default=AttendanceStatus.CLOSED),
    clock_out_source: ClockOutSource | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("exports:read")),
    db: Session = Depends(get_db),
) -> Response:
    check_plan_feature(db, ctx.company_id, "has_exports", actor_user_id=ctx.user.id)
    if employee_id is not None or date_from is not None or date_to is not None:
        check_plan_feature(db, ctx.company_id, "has_advanced_filters", actor_user_id=ctx.user.id)

    sessions = ExportService(db, company_id=ctx.company_id).list_exportable_sessions(
        employee_id=employee_id,
        status=status,
        clock_out_source=clock_out_source,
        date_from=date_from,
        date_to=date_to,
    )
    rows = [_attendance_row(session, ctx.company.timezone) for session in sessions]
    filename_base = f"clockly-fichajes-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}"
    range_label = _range_label(date_from, date_to, ctx.company.timezone)

    if export_format == "csv":
        content = _build_csv(rows)
        media_type = "text/csv; charset=utf-8"
        filename = f"{filename_base}.csv"
    elif export_format == "pdf":
        content = _build_pdf(
            company_name=ctx.company.name,
            timezone=ctx.company.timezone,
            range_label=range_label,
            rows=rows,
        )
        media_type = "application/pdf"
        filename = f"{filename_base}.pdf"
    else:
        content = _build_xlsx(
            company_name=ctx.company.name,
            timezone=ctx.company.timezone,
            range_label=range_label,
            rows=rows,
        )
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{filename_base}.xlsx"

    db.commit()
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _attendance_row(session: AttendanceSession, timezone: str) -> dict[str, object]:
    clock_in = to_tenant_timezone(session.clock_in, timezone)
    clock_out = to_tenant_timezone(session.clock_out, timezone)
    return {
        "Empleado": session.employee.full_name if session.employee else str(session.employee_id),
        "DNI / ID": session.employee.dni if session.employee and session.employee.dni else str(session.employee_id),
        "Fecha entrada": clock_in.date() if clock_in else None,
        "Hora entrada": clock_in.time().replace(second=0, microsecond=0) if clock_in else None,
        "Fecha salida": clock_out.date() if clock_out else None,
        "Hora salida": clock_out.time().replace(second=0, microsecond=0) if clock_out else None,
        "Duración (hh:mm)": _format_duration(session.duration_seconds),
        "Estado": _enum_label(session.status, ATTENDANCE_STATUS_LABELS),
        "Origen salida": _enum_label(session.clock_out_source, CLOCK_OUT_SOURCE_LABELS),
        "Incidencia": "Desfichaje automático" if session.incident_type else "No",
        "Notas": session.notes or "",
    }


@router.get("/itss-registro")
def export_itss_registro(
    year: int = Query(..., ge=2020, le=2100, description="Año del periodo"),
    month: int = Query(..., ge=1, le=12, description="Mes del periodo (1-12)"),
    employee_id: UUID | None = Query(default=None),
    export_format: Literal["xlsx", "pdf"] = Query(default="xlsx", alias="format"),
    ctx: TenantContext = Depends(require_permission("exports:read")),
    db: Session = Depends(get_db),
) -> Response:
    """Exporta el libro-registro de jornada en formato requerido por ITSS (Inspección de Trabajo).

    Incluye: empresa, CIF, empleado, DNI, fecha, hora entrada/salida, horas trabajadas.
    Ordenado por empleado y fecha, con totales mensuales por empleado.
    """
    check_plan_feature(db, ctx.company_id, "has_exports", actor_user_id=ctx.user.id)

    period_start = datetime(year, month, 1, tzinfo=UTC)
    last_day = calendar.monthrange(year, month)[1]
    period_end = datetime(year, month, last_day, 23, 59, 59, tzinfo=UTC)

    sessions = ExportService(db, company_id=ctx.company_id).list_exportable_sessions(
        employee_id=employee_id,
        status=AttendanceStatus.CLOSED,
        date_from=period_start,
        date_to=period_end,
    )

    company = ctx.company
    rows = [_itss_row(s, company.timezone) for s in sessions]
    rows.sort(key=lambda r: (r["Empleado"], r["Fecha entrada"] or date.min))

    month_label = f"{year}-{month:02d}"
    filename_base = f"clockly-libro-registro-{month_label}"

    if export_format == "pdf":
        content = _build_itss_pdf(
            company_name=company.name,
            cif=getattr(company, "cif", None),
            month_label=month_label,
            rows=rows,
        )
        media_type = "application/pdf"
        filename = f"{filename_base}.pdf"
    else:
        content = _build_itss_xlsx(
            company_name=company.name,
            cif=getattr(company, "cif", None),
            month_label=month_label,
            timezone=company.timezone,
            rows=rows,
        )
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{filename_base}.xlsx"

    db.commit()
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


_ITSS_HEADERS = [
    "Empleado",
    "DNI / NIE",
    "Fecha entrada",
    "Hora entrada",
    "Fecha salida",
    "Hora salida",
    "Horas trabajadas",
    "Validación",
]


def _itss_row(session: AttendanceSession, timezone: str) -> dict[str, object]:
    clock_in = to_tenant_timezone(session.clock_in, timezone)
    clock_out = to_tenant_timezone(session.clock_out, timezone)
    total_seconds = session.duration_seconds or 0
    hours, remainder = divmod(total_seconds, 3600)
    minutes = remainder // 60
    return {
        "Empleado": session.employee.full_name if session.employee else str(session.employee_id),
        "DNI / NIE": (session.employee.dni if session.employee and session.employee.dni else ""),
        "Fecha entrada": clock_in.date() if clock_in else None,
        "Hora entrada": clock_in.time().replace(second=0, microsecond=0) if clock_in else None,
        "Fecha salida": clock_out.date() if clock_out else None,
        "Hora salida": clock_out.time().replace(second=0, microsecond=0) if clock_out else None,
        "Horas trabajadas": f"{hours:02d}:{minutes:02d}",
        "Validación": "",
    }


def _build_itss_xlsx(
    *,
    company_name: str,
    cif: str | None,
    month_label: str,
    timezone: str,
    rows: list[dict[str, object]],
) -> bytes:
    kit = require_xlsx_kit("XLSX export requires the openpyxl package.")
    workbook = kit.Workbook()
    sheet = workbook.active
    sheet.title = "Libro Registro"
    prepare_worksheet(sheet)

    last_column = len(_ITSS_HEADERS)
    cif_str = f"CIF: {cif}" if cif else "CIF: —"
    next_row = write_report_title(
        sheet,
        kit,
        title="Libro Registro de Jornada",
        company_name=company_name,
        details=[
            cif_str,
            f"Periodo: {month_label}",
            f"Zona horaria: {timezone}",
            "Art. 34.9 ET — Real Decreto-ley 8/2019",
        ],
        last_column=last_column,
    )

    total_hours = sum(_duration_to_hours(str(row.get("Horas trabajadas", "00:00"))) for row in rows)
    employee_count = len({str(row.get("Empleado")) for row in rows if row.get("Empleado")})
    header_row = write_kpi_cards(
        sheet,
        kit,
        start_row=next_row,
        last_column=last_column,
        metrics=[
            ("Registros", str(len(rows))),
            ("Horas totales", metric_number(total_hours)),
            ("Empleados", str(employee_count)),
            ("Periodo", month_label),
        ],
    )

    write_table_header(sheet, kit, header_row=header_row, headers=_ITSS_HEADERS)
    data_start_row = header_row + 1

    if rows:
        for row_index, row in enumerate(rows, start=data_start_row):
            for col_index, header in enumerate(_ITSS_HEADERS, start=1):
                sheet.cell(row=row_index, column=col_index, value=row[header])
    else:
        sheet.cell(row=data_start_row, column=1, value="Sin registros en este periodo")

    last_row = header_row + max(len(rows), 1)
    style_table_body(
        sheet,
        kit,
        first_row=data_start_row,
        last_row=last_row,
        last_column=last_column,
        center_columns={3, 4, 5, 6, 7},
        wrap_columns={1, 8},
    )
    for col in (3, 5):
        set_number_format(sheet, column=col, first_row=data_start_row, last_row=last_row, number_format=DATE_FORMAT)
    for col in (4, 6):
        set_number_format(sheet, column=col, first_row=data_start_row, last_row=last_row, number_format=TIME_FORMAT)

    set_column_widths(sheet, kit, [30, 18, 15, 13, 15, 13, 18, 24])
    sheet.freeze_panes = f"A{data_start_row}"
    add_excel_table(
        sheet,
        kit,
        name="ClockLyLibroRegistro",
        header_row=header_row,
        last_row=last_row,
        last_column=last_column,
    )

    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


def _build_itss_pdf(
    *,
    company_name: str,
    cif: str | None,
    month_label: str,
    rows: list[dict[str, object]],
) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ModuleNotFoundError as exc:
        raise ConflictError("PDF export requires the reportlab package.") from exc

    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=24,
        leftMargin=24,
        topMargin=24,
        bottomMargin=24,
        title=f"Libro Registro - {company_name}",
    )
    styles = getSampleStyleSheet()
    cif_str = f" | CIF: {cif}" if cif else ""
    story = [
        Paragraph("<b>Libro Registro de Jornada</b>", styles["Title"]),
        Paragraph(f"<b>{company_name}</b>{cif_str}", styles["Heading2"]),
        Paragraph(f"Periodo: {month_label} | Art. 34.9 ET — Real Decreto-ley 8/2019", styles["Normal"]),
        Spacer(1, 14),
    ]

    table_rows: list[list[str]] = [_ITSS_HEADERS]
    for row in rows:
        table_rows.append([_display_value(row.get(h, "")) for h in _ITSS_HEADERS])
    if len(table_rows) == 1:
        table_rows.append(["Sin registros en este periodo", *[""] * (len(_ITSS_HEADERS) - 1)])

    table = Table(table_rows, repeatRows=1, colWidths=[110, 72, 60, 48, 60, 48, 72, 90])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1D4ED8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (2, 1), (6, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return output.getvalue()


@router.get("/salary-calculation")
def export_salary_calculation(
    export_format: Literal["excel", "xlsx", "pdf"] = Query(default="xlsx", alias="format"),
    employee_id: UUID = Query(...),
    period_start: date = Query(..., alias="from"),
    period_end: date = Query(..., alias="to"),
    ctx: TenantContext = Depends(require_permission("salary:read")),
    db: Session = Depends(get_db),
) -> Response:
    check_plan_feature(db, ctx.company_id, "has_exports", actor_user_id=ctx.user.id)
    calculation = SalaryService(db, company_id=ctx.company_id).calculate(
        employee_id=employee_id,
        period_start=period_start,
        period_end=period_end,
    )
    filename_base = f"clockly-salarios-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}"
    if export_format == "pdf":
        content = _build_salary_pdf(company_name=ctx.company.name, calculation=calculation)
        media_type = "application/pdf"
        filename = f"{filename_base}.pdf"
    else:
        content = _build_salary_xlsx(company_name=ctx.company.name, calculation=calculation)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{filename_base}.xlsx"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _range_label(date_from: datetime | None, date_to: datetime | None, timezone: str) -> str:
    start = to_tenant_timezone(date_from, timezone) if date_from else None
    end = to_tenant_timezone(date_to, timezone) if date_to else None
    if start and end:
        return f"{start.strftime('%Y-%m-%d')} a {end.strftime('%Y-%m-%d')}"
    if start:
        return f"Desde {start.strftime('%Y-%m-%d')}"
    if end:
        return f"Hasta {end.strftime('%Y-%m-%d')}"
    return "Todos los registros"


def _format_duration(total_seconds: int | None) -> str:
    total_seconds = total_seconds or 0
    hours, remainder = divmod(total_seconds, 3600)
    minutes = remainder // 60
    return f"{hours:02d}:{minutes:02d}"


def _enum_label(value: object | None, labels: dict[str, str]) -> str:
    if value is None:
        return ""
    raw = getattr(value, "value", value)
    return labels.get(str(raw), str(raw))


def _duration_to_hours(value: object) -> float:
    if not isinstance(value, str) or ":" not in value:
        return 0.0
    hours, minutes = value.split(":", 1)
    try:
        return int(hours) + (int(minutes) / 60)
    except ValueError:
        return 0.0


def _display_value(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, time):
        return value.strftime("%H:%M")
    return str(value)


def _build_xlsx(*, company_name: str, timezone: str, range_label: str, rows: list[dict[str, object]]) -> bytes:
    kit = require_xlsx_kit("XLSX export requires the openpyxl package.")
    workbook = kit.Workbook()
    sheet = workbook.active
    sheet.title = "Fichajes"
    prepare_worksheet(sheet)

    last_column = len(HEADERS)
    next_row = write_report_title(
        sheet,
        kit,
        title="ClockLy | Fichajes y horas",
        company_name=company_name,
        details=[f"Rango: {range_label}", f"Zona horaria: {timezone}"],
        last_column=last_column,
    )

    total_hours = sum(_duration_to_hours(row.get("Duración (hh:mm)")) for row in rows)
    employee_count = len({str(row.get("Empleado")) for row in rows if row.get("Empleado")})
    incident_count = sum(1 for row in rows if row.get("Incidencia") not in {"", "No", None})
    header_row = write_kpi_cards(
        sheet,
        kit,
        start_row=next_row,
        last_column=last_column,
        metrics=[
            ("Registros", str(len(rows))),
            ("Horas totales", metric_number(total_hours)),
            ("Empleados", str(employee_count)),
            ("Incidencias", str(incident_count)),
        ],
    )

    write_table_header(sheet, kit, header_row=header_row, headers=HEADERS)
    data_start_row = header_row + 1
    if rows:
        for row_index, row in enumerate(rows, start=data_start_row):
            for column, header in enumerate(HEADERS, start=1):
                sheet.cell(row=row_index, column=column, value=row[header])
    else:
        sheet.cell(row=data_start_row, column=1, value="Sin registros")

    last_row = header_row + max(len(rows), 1)
    style_table_body(
        sheet,
        kit,
        first_row=data_start_row,
        last_row=last_row,
        last_column=last_column,
        center_columns={3, 4, 5, 6, 7, 8, 9, 10},
        wrap_columns={1, 10, 11},
    )
    for row_index in range(data_start_row, last_row + 1):
        apply_status_style(sheet.cell(row=row_index, column=8), kit)
    for column in (3, 5):
        set_number_format(sheet, column=column, first_row=data_start_row, last_row=last_row, number_format=DATE_FORMAT)
    for column in (4, 6):
        set_number_format(sheet, column=column, first_row=data_start_row, last_row=last_row, number_format=TIME_FORMAT)

    set_column_widths(sheet, kit, [28, 18, 15, 13, 15, 13, 18, 14, 16, 22, 42])
    sheet.freeze_panes = f"A{data_start_row}"
    add_excel_table(sheet, kit, name="ClockLyFichajes", header_row=header_row, last_row=last_row, last_column=last_column)

    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


def _build_csv(rows: list[dict[str, object]]) -> bytes:
    buffer = StringIO()
    writer = csv_module.DictWriter(
        buffer,
        fieldnames=HEADERS,
        delimiter=",",
        extrasaction="ignore",
        lineterminator="\r\n",
    )
    writer.writeheader()
    for row in rows:
        writer.writerow({header: _display_value(row.get(header, "")) for header in HEADERS})
    return ("\ufeff" + buffer.getvalue()).encode("utf-8")


def _build_pdf(*, company_name: str, timezone: str, range_label: str, rows: list[dict[str, str]]) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ModuleNotFoundError as exc:
        raise ConflictError("PDF export requires the reportlab package.") from exc

    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=24,
        leftMargin=24,
        topMargin=24,
        bottomMargin=24,
        title=f"Fichajes - {company_name}",
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph("<b>ClockLy</b>", styles["Title"]),
        Paragraph(f"<b>{company_name}</b>", styles["Heading2"]),
        Paragraph(f"Informe de fichajes | Rango: {range_label} | Zona horaria: {timezone}", styles["Normal"]),
        Spacer(1, 14),
    ]

    table_rows: list[list[str]] = [HEADERS]
    for row in rows:
        table_rows.append([_display_value(row[header]) for header in HEADERS])
    if len(table_rows) == 1:
        table_rows.append(["Sin registros", *[""] * (len(HEADERS) - 1)])

    table = Table(table_rows, repeatRows=1, colWidths=[105, 78, 68, 52, 68, 52, 70, 56, 62, 88, 140])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (2, 1), (7, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return output.getvalue()


def _build_salary_xlsx(*, company_name: str, calculation) -> bytes:
    kit = require_xlsx_kit("XLSX export requires the openpyxl package.")
    headers = [
        "Empleado ID",
        "Periodo",
        "Tipo",
        "Tarifa",
        "Horas",
        "Dias",
        "Turnos",
        "Incidencias",
        "Total estimado",
    ]
    workbook = kit.Workbook()
    sheet = workbook.active
    sheet.title = "Salarios estimados"
    prepare_worksheet(sheet)

    last_column = len(headers)
    next_row = write_report_title(
        sheet,
        kit,
        title="ClockLy | Salarios estimados",
        company_name=company_name,
        details=[f"Periodo: {calculation.period_start} a {calculation.period_end}", calculation.warning],
        last_column=last_column,
    )
    header_row = write_kpi_cards(
        sheet,
        kit,
        start_row=next_row,
        last_column=last_column,
        metrics=[
            ("Total estimado", f"{metric_number(float(calculation.gross_estimated_amount))} {calculation.currency}"),
            ("Horas", metric_number(float(calculation.total_hours))),
            ("Días", str(calculation.total_days)),
            ("Incidencias", str(calculation.incident_count)),
        ],
    )

    write_table_header(sheet, kit, header_row=header_row, headers=headers)
    data_start_row = header_row + 1

    if calculation.lines:
        for row_index, line in enumerate(calculation.lines, start=data_start_row):
            values = [
                str(calculation.employee_id),
                f"{line.period_start} a {line.period_end}",
                _enum_label(line.salary_type, SALARY_TYPE_LABELS),
                float(line.amount),
                float(line.total_hours),
                line.total_days,
                line.total_shifts,
                line.incident_count,
                float(line.gross_estimated_amount),
            ]
            for column, value in enumerate(values, start=1):
                cell = sheet.cell(row=row_index, column=column, value=value)
                if column in {4, 9}:
                    cell.number_format = f'{MONEY_FORMAT} "{line.currency}"'
    else:
        sheet.cell(row=data_start_row, column=1, value="Sin líneas de cálculo")

    last_row = header_row + max(len(calculation.lines), 1)
    style_table_body(
        sheet,
        kit,
        first_row=data_start_row,
        last_row=last_row,
        last_column=last_column,
        center_columns={2, 3, 5, 6, 7, 8},
        wrap_columns={1, 2},
    )
    set_number_format(sheet, column=5, first_row=data_start_row, last_row=last_row, number_format=NUMBER_FORMAT)

    add_excel_table(
        sheet,
        kit,
        name="ClockLySalarios",
        header_row=header_row,
        last_row=last_row,
        last_column=last_column,
    )

    summary_row = last_row + 2
    sheet.merge_cells(start_row=summary_row, start_column=1, end_row=summary_row, end_column=8)
    summary_label = sheet.cell(row=summary_row, column=1, value="Total estimado")
    summary_label.font = kit.Font(bold=True, color="FFFFFF")
    summary_label.fill = kit.PatternFill("solid", fgColor="1D4ED8")
    summary_label.alignment = kit.Alignment(horizontal="right", vertical="center")
    summary_value = sheet.cell(row=summary_row, column=9, value=float(calculation.gross_estimated_amount))
    summary_value.font = kit.Font(bold=True, color="FFFFFF")
    summary_value.fill = kit.PatternFill("solid", fgColor="1D4ED8")
    summary_value.number_format = f'{MONEY_FORMAT} "{calculation.currency}"'
    summary_value.alignment = kit.Alignment(horizontal="center", vertical="center")

    set_column_widths(sheet, kit, [38, 24, 16, 16, 12, 10, 10, 14, 18])
    sheet.freeze_panes = f"A{data_start_row}"
    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


@router.get("/payroll")
def export_payroll(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    export_format: Literal["csv", "xlsx"] = Query(default="xlsx", alias="format"),
    target: Literal["a3", "holded", "generic"] = Query(default="generic"),
    ctx: TenantContext = Depends(require_permission("exports:read")),
    db: Session = Depends(get_db),
) -> Response:
    """Exporta datos de nómina compatibles con A3 (CSV) o Holded (XLSX).

    Por empleado: horas normales, horas extra (>8h/día), retrasos, sesiones.
    """
    check_plan_feature(db, ctx.company_id, "has_exports", actor_user_id=ctx.user.id)

    period_start = datetime(year, month, 1, tzinfo=UTC)
    last_day = calendar.monthrange(year, month)[1]
    period_end = datetime(year, month, last_day, 23, 59, 59, tzinfo=UTC)
    month_label = f"{year}-{month:02d}"

    rows = _build_payroll_rows(db, company_id=ctx.company_id, date_from=period_start, date_to=period_end)
    filename_base = f"clockly-nomina-{month_label}"

    if export_format == "csv":
        content_bytes = _build_payroll_csv(rows=rows, target=target)
        media_type = "text/csv; charset=utf-8"
        filename = f"{filename_base}.csv"
        return Response(
            content=content_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    content_bytes = _build_payroll_xlsx(
        company_name=ctx.company.name,
        cif=getattr(ctx.company, "cif", None),
        month_label=month_label,
        rows=rows,
        target=target,
    )
    return Response(
        content=content_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename_base}.xlsx"'},
    )


_PAYROLL_HEADERS_GENERIC = [
    "Empleado",
    "DNI / NIE",
    "Periodo",
    "Sesiones",
    "Horas normales",
    "Horas extra",
    "Retrasos",
    "Notas",
]
_PAYROLL_HEADERS_A3 = ["NOMBRE", "DNI", "PERIODO", "HORAS_NORMALES", "HORAS_EXTRA", "RETRASOS", "SESIONES"]
_PAYROLL_HEADERS_HOLDED = ["Nombre", "DNI/NIE", "Periodo", "Sesiones", "Horas normales", "Horas extra", "Retrasos"]


def _build_payroll_rows(
    db: Session,
    *,
    company_id: UUID,
    date_from: datetime,
    date_to: datetime,
) -> list[dict[str, object]]:
    # Aggregate sessions per employee
    session_agg = db.execute(
        select(
            AttendanceSession.employee_id,
            func.count(AttendanceSession.id).label("sessions"),
            func.coalesce(func.sum(AttendanceSession.duration_seconds), 0).label("total_seconds"),
        )
        .where(
            AttendanceSession.company_id == company_id,
            AttendanceSession.status == AttendanceStatus.CLOSED,
            AttendanceSession.clock_in >= date_from,
            AttendanceSession.clock_in <= date_to,
        )
        .group_by(AttendanceSession.employee_id)
    ).fetchall()

    if not session_agg:
        return []

    emp_ids = [r.employee_id for r in session_agg]

    # Employee names + DNI
    emp_data = {
        row.id: {"name": f"{row.first_name} {row.last_name}".strip(), "dni": row.dni or ""}
        for row in db.execute(
            select(Employee.id, Employee.first_name, Employee.last_name, Employee.dni).where(
                Employee.id.in_(emp_ids)
            )
        ).fetchall()
    }

    # Late arrivals per employee
    late_counts = {
        row.employee_id: row.n
        for row in db.execute(
            select(LateArrival.employee_id, func.count(LateArrival.id).label("n"))
            .where(
                LateArrival.company_id == company_id,
                LateArrival.date >= date_from.date(),
                LateArrival.date <= date_to.date(),
                LateArrival.employee_id.in_(emp_ids),
            )
            .group_by(LateArrival.employee_id)
        ).fetchall()
    }

    # Max daily overtime: cap each day at 8h, excess = overtime
    # We compute per-day sums then accumulate — one extra query
    from sqlalchemy import cast, Date as SADate

    day_agg = db.execute(
        select(
            AttendanceSession.employee_id,
            cast(AttendanceSession.clock_in, SADate).label("day"),
            func.coalesce(func.sum(AttendanceSession.duration_seconds), 0).label("day_seconds"),
        )
        .where(
            AttendanceSession.company_id == company_id,
            AttendanceSession.status == AttendanceStatus.CLOSED,
            AttendanceSession.clock_in >= date_from,
            AttendanceSession.clock_in <= date_to,
            AttendanceSession.employee_id.in_(emp_ids),
        )
        .group_by(AttendanceSession.employee_id, cast(AttendanceSession.clock_in, SADate))
    ).fetchall()

    overtime_by_emp: dict[UUID, float] = {}
    for row in day_agg:
        daily_h = row.day_seconds / 3600
        ot = max(0.0, daily_h - 8.0)
        overtime_by_emp[row.employee_id] = overtime_by_emp.get(row.employee_id, 0.0) + ot

    period_str = f"{date_from.strftime('%Y-%m')}"
    results: list[dict[str, object]] = []
    for agg in session_agg:
        emp = emp_data.get(agg.employee_id, {"name": str(agg.employee_id), "dni": ""})
        total_h = round(agg.total_seconds / 3600, 2)
        overtime_h = round(overtime_by_emp.get(agg.employee_id, 0.0), 2)
        normal_h = round(max(0.0, total_h - overtime_h), 2)
        results.append(
            {
                "Empleado": emp["name"],
                "DNI / NIE": emp["dni"],
                "Periodo": period_str,
                "Sesiones": agg.sessions,
                "Horas normales": normal_h,
                "Horas extra": overtime_h,
                "Retrasos": late_counts.get(agg.employee_id, 0),
                "Notas": "",
            }
        )
    results.sort(key=lambda r: str(r.get("Empleado", "")))
    return results


def _build_payroll_csv(*, rows: list[dict[str, object]], target: str) -> bytes:
    import csv as csv_module
    from io import StringIO

    if target == "a3":
        headers = _PAYROLL_HEADERS_A3
        field_map = {
            "NOMBRE": "Empleado",
            "DNI": "DNI / NIE",
            "PERIODO": "Periodo",
            "HORAS_NORMALES": "Horas normales",
            "HORAS_EXTRA": "Horas extra",
            "RETRASOS": "Retrasos",
            "SESIONES": "Sesiones",
        }
        delimiter = ";"
    else:
        headers = _PAYROLL_HEADERS_GENERIC
        field_map = {h: h for h in headers}
        delimiter = ","

    buf = StringIO()
    writer = csv_module.DictWriter(
        buf,
        fieldnames=headers,
        delimiter=delimiter,
        extrasaction="ignore",
        lineterminator="\r\n",
    )
    writer.writeheader()
    for row in rows:
        writer.writerow({h: row.get(field_map[h], "") for h in headers})
    return ("﻿" + buf.getvalue()).encode("utf-8")


def _build_payroll_xlsx(
    *,
    company_name: str,
    cif: str | None,
    month_label: str,
    rows: list[dict[str, object]],
    target: str,
) -> bytes:
    kit = require_xlsx_kit("XLSX export requires the openpyxl package.")
    workbook = kit.Workbook()
    sheet = workbook.active
    headers = _PAYROLL_HEADERS_HOLDED if target == "holded" else _PAYROLL_HEADERS_GENERIC
    sheet.title = "Nómina"
    prepare_worksheet(sheet)

    last_column = len(headers)
    cif_str = f"CIF: {cif}" if cif else "CIF: —"
    target_label = {"a3": "A3 Nomina", "holded": "Holded", "generic": "Genérico"}.get(target, target)
    next_row = write_report_title(
        sheet,
        kit,
        title="ClockLy | Resumen de nómina",
        company_name=company_name,
        details=[cif_str, f"Periodo: {month_label}", f"Formato: {target_label}"],
        last_column=last_column,
    )

    total_normal = sum(float(r.get("Horas normales", 0)) for r in rows)
    total_overtime = sum(float(r.get("Horas extra", 0)) for r in rows)
    header_row = write_kpi_cards(
        sheet,
        kit,
        start_row=next_row,
        last_column=last_column,
        metrics=[
            ("Empleados", str(len(rows))),
            ("Horas normales", metric_number(total_normal)),
            ("Horas extra", metric_number(total_overtime)),
            ("Periodo", month_label),
        ],
    )

    field_keys = (
        ["Nombre", "DNI/NIE", "Periodo", "Sesiones", "Horas normales", "Horas extra", "Retrasos"]
        if target == "holded"
        else _PAYROLL_HEADERS_GENERIC
    )
    source_keys = ["Empleado", "DNI / NIE", "Periodo", "Sesiones", "Horas normales", "Horas extra", "Retrasos", "Notas"]

    write_table_header(sheet, kit, header_row=header_row, headers=headers)
    data_start_row = header_row + 1

    if rows:
        for row_index, row in enumerate(rows, start=data_start_row):
            for col_index, src_key in enumerate(source_keys[: len(headers)], start=1):
                sheet.cell(row=row_index, column=col_index, value=row.get(src_key, ""))
    else:
        sheet.cell(row=data_start_row, column=1, value="Sin registros en este periodo")

    last_row = header_row + max(len(rows), 1)
    style_table_body(
        sheet,
        kit,
        first_row=data_start_row,
        last_row=last_row,
        last_column=last_column,
        center_columns={3, 4, 5, 6, 7},
    )
    set_number_format(sheet, column=5, first_row=data_start_row, last_row=last_row, number_format=NUMBER_FORMAT)
    set_number_format(sheet, column=6, first_row=data_start_row, last_row=last_row, number_format=NUMBER_FORMAT)
    set_column_widths(sheet, kit, [28, 18, 12, 10, 16, 14, 10, 30][: len(headers)])
    sheet.freeze_panes = f"A{data_start_row}"
    add_excel_table(
        sheet, kit, name="ClockLyNomina", header_row=header_row, last_row=last_row, last_column=last_column
    )

    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


def _build_salary_pdf(*, company_name: str, calculation) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ModuleNotFoundError as exc:
        raise ConflictError("PDF export requires the reportlab package.") from exc

    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=24,
        leftMargin=24,
        topMargin=24,
        bottomMargin=24,
        title=f"Salarios estimados - {company_name}",
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph("<b>ClockLy - Salarios estimados</b>", styles["Title"]),
        Paragraph(f"<b>{company_name}</b>", styles["Heading2"]),
        Paragraph(
            f"Periodo: {calculation.period_start} a {calculation.period_end} | {calculation.warning}",
            styles["Normal"],
        ),
        Spacer(1, 14),
    ]
    headers = ["Tipo", "Tarifa", "Horas", "Dias", "Turnos", "Inc.", "Total estimado"]
    table_rows = [headers]
    for line in calculation.lines:
        table_rows.append(
            [
                line.salary_type.value,
                f"{line.amount} {line.currency}",
                str(line.total_hours),
                str(line.total_days),
                str(line.total_shifts),
                str(line.incident_count),
                f"{line.gross_estimated_amount} {line.currency}",
            ]
        )
    table_rows.append(["", "", "", "", "", "Total", f"{calculation.gross_estimated_amount} {calculation.currency}"])
    table = Table(table_rows, repeatRows=1, colWidths=[85, 85, 60, 50, 55, 45, 105])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (5, -1), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#F8FAFC")]),
                ("ALIGN", (2, 1), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return output.getvalue()
