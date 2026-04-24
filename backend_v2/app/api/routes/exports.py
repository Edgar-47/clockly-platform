from __future__ import annotations

from datetime import UTC, datetime
from html import escape
from io import BytesIO
from typing import Literal
from uuid import UUID
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.attendance_session import AttendanceSession
from app.models.enums import AttendanceStatus
from app.services.export_service import ExportService
from app.services.plans import check_plan_feature


router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/attendance")
def export_attendance(
    export_format: Literal["excel", "xlsx", "pdf"] = Query(default="xlsx", alias="format"),
    employee_id: UUID | None = Query(default=None),
    status: AttendanceStatus | None = Query(default=AttendanceStatus.CLOSED),
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
        date_from=date_from,
        date_to=date_to,
    )
    rows = _attendance_rows(sessions)
    filename_base = f"clockly-attendance-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}"

    if export_format == "pdf":
        content = _build_pdf(rows)
        media_type = "application/pdf"
        filename = f"{filename_base}.pdf"
    else:
        content = _build_xlsx(rows)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{filename_base}.xlsx"

    db.commit()
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _attendance_rows(sessions: list[AttendanceSession]) -> list[list[str]]:
    rows = [["Empleado", "Entrada", "Salida", "Duracion segundos", "Estado", "Notas"]]
    for session in sessions:
        rows.append(
            [
                session.employee.full_name if session.employee else str(session.employee_id),
                session.clock_in.isoformat(),
                session.clock_out.isoformat() if session.clock_out else "",
                str(session.duration_seconds or 0),
                session.status.value,
                session.notes or "",
            ]
        )
    return rows


def _build_xlsx(rows: list[list[str]]) -> bytes:
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", _xlsx_content_types())
        zf.writestr("_rels/.rels", _xlsx_root_rels())
        zf.writestr("xl/workbook.xml", _xlsx_workbook())
        zf.writestr("xl/_rels/workbook.xml.rels", _xlsx_workbook_rels())
        zf.writestr("xl/worksheets/sheet1.xml", _xlsx_sheet(rows))
    return output.getvalue()


def _xlsx_sheet(rows: list[list[str]]) -> str:
    row_xml: list[str] = []
    for row_index, row in enumerate(rows, start=1):
        cells = []
        for column_index, value in enumerate(row, start=1):
            ref = f"{_xlsx_column(column_index)}{row_index}"
            cells.append(
                f'<c r="{ref}" t="inlineStr"><is><t>{escape(value)}</t></is></c>'
            )
        row_xml.append(f'<row r="{row_index}">{"".join(cells)}</row>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(row_xml)}</sheetData>'
        "</worksheet>"
    )


def _xlsx_column(index: int) -> str:
    letters = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


def _xlsx_content_types() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        "</Types>"
    )


def _xlsx_root_rels() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        "</Relationships>"
    )


def _xlsx_workbook() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="Fichajes" sheetId="1" r:id="rId1"/></sheets>'
        "</workbook>"
    )


def _xlsx_workbook_rels() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        "</Relationships>"
    )


def _build_pdf(rows: list[list[str]]) -> bytes:
    lines = ["ClockLy - Exportacion de fichajes", ""]
    for row in rows[:70]:
        lines.append(" | ".join(row[:5]))
    content = "BT /F1 9 Tf 40 800 Td 12 TL " + " T* ".join(f"({_pdf_escape(line[:115])}) Tj" for line in lines) + " ET"
    stream = content.encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    pdf = BytesIO()
    pdf.write(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(pdf.tell())
        pdf.write(f"{index} 0 obj\n".encode("ascii"))
        pdf.write(obj)
        pdf.write(b"\nendobj\n")
    xref = pdf.tell()
    pdf.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.write(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.write(
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode("ascii")
    )
    return pdf.getvalue()


def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
