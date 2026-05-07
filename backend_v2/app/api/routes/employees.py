from __future__ import annotations

import csv
import io
import logging
import re
from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.errors import AppError, NotFoundError, ValidationError
from app.core.rate_limit import upload_limiter
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.employee import (
    CsvImportResult,
    CsvRowError,
    EmployeeCreate,
    EmployeeListResponse,
    EmployeeOwnPinChange,
    EmployeePinReset,
    EmployeeRead,
    EmployeeUpdate,
)
from app.services.employee_service import EmployeeService


router = APIRouter(prefix="/employees", tags=["employees"])
logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_CSV_REQUIRED = {"nombre", "apellidos"}
_CSV_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
_CSV_ALLOWED_MIME_TYPES = {"text/csv", "application/csv", "application/vnd.ms-excel", "text/plain", ""}


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    include_inactive: bool = Query(default=False),
    include_deleted: bool = Query(default=False),
    limit: int | None = Query(default=None, ge=1, le=500, description="Max items to return. Omit for all."),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("employees:read")),
    db: Session = Depends(get_db),
) -> EmployeeListResponse:
    items, total = EmployeeService(db, company_id=ctx.company_id).list_employees(
        include_inactive=include_inactive,
        include_deleted=include_deleted,
        limit=limit,
        offset=offset,
    )
    return EmployeeListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/me/profile", response_model=EmployeeRead)
def get_own_employee_profile(
    ctx: TenantContext = Depends(require_permission("attendance:write")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    employee = EmployeeRepository(db, company_id=ctx.company_id).get_by_user_id(ctx.user.id)
    if employee is None:
        raise NotFoundError("Employee profile not found for this user.")
    return employee


@router.get("/{employee_id}", response_model=EmployeeRead)
def get_employee(
    employee_id: UUID,
    ctx: TenantContext = Depends(require_permission("employees:read")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    employee = EmployeeRepository(db, company_id=ctx.company_id).get(employee_id)
    if employee is None:
        raise NotFoundError("Employee not found.")
    return employee


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    ctx: TenantContext = Depends(require_permission("employees:write")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    return EmployeeService(db, company_id=ctx.company_id).create_employee(payload, actor_user_id=ctx.user.id)


@router.patch("/{employee_id}", response_model=EmployeeRead)
def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    ctx: TenantContext = Depends(require_permission("employees:write")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    return EmployeeService(db, company_id=ctx.company_id).update_employee(employee_id, payload, actor_user_id=ctx.user.id)


@router.post("/me/pin", response_model=EmployeeRead)
def change_own_pin(
    payload: EmployeeOwnPinChange,
    ctx: TenantContext = Depends(require_permission("attendance:write")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    return EmployeeService(db, company_id=ctx.company_id).change_own_pin(
        ctx.user,
        current_pin=payload.current_pin,
        new_pin=payload.new_pin,
    )


@router.post("/{employee_id}/pin", response_model=EmployeeRead)
def reset_employee_pin(
    employee_id: UUID,
    payload: EmployeePinReset,
    ctx: TenantContext = Depends(require_permission("employees:write")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    return EmployeeService(db, company_id=ctx.company_id).reset_pin(
        employee_id,
        payload.pin,
        actor_user_id=ctx.user.id,
    )


@router.delete("/{employee_id}", response_model=EmployeeRead)
def delete_employee(
    employee_id: UUID,
    ctx: TenantContext = Depends(require_permission("employees:write")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    return EmployeeService(db, company_id=ctx.company_id).soft_delete_employee(
        employee_id,
        actor_user_id=ctx.user.id,
    )


@router.post("/csv-preview", response_model=CsvImportResult)
async def preview_csv_import(
    file: UploadFile,
    ctx: TenantContext = Depends(require_permission("employees:write")),
) -> CsvImportResult:
    """Parse CSV and return validation results without persisting anything."""
    _rate_limit_upload(ctx)
    _validate_csv_upload(file)
    content = await file.read(_CSV_MAX_BYTES + 1)
    if len(content) > _CSV_MAX_BYTES:
        raise ValidationError("CSV file exceeds 2 MB limit.")
    return _parse_csv(content, dry_run=True)


@router.post("/csv-import", response_model=CsvImportResult, status_code=status.HTTP_201_CREATED)
async def import_csv_employees(
    file: UploadFile,
    ctx: TenantContext = Depends(require_permission("employees:write")),
    db: Session = Depends(get_db),
) -> CsvImportResult:
    """Import employees from a CSV file.

    Expected columns (case-insensitive, UTF-8):
      nombre*, apellidos*, email, puesto, dni, pin (4 digits), salario_mensual (ignored, for UX)

    Rows with validation errors are skipped; valid rows are created.
    Returns a summary of imported rows, skipped rows, and per-row errors.
    """
    _rate_limit_upload(ctx)
    _validate_csv_upload(file)
    content = await file.read(_CSV_MAX_BYTES + 1)
    if len(content) > _CSV_MAX_BYTES:
        raise ValidationError("CSV file exceeds 2 MB limit.")

    parsed = _parse_csv(content, dry_run=False)
    if not parsed.preview:
        return parsed

    service = EmployeeService(db, company_id=ctx.company_id)
    imported = 0
    skipped = parsed.skipped
    errors: list[CsvRowError] = list(parsed.errors)

    for row_num, row in enumerate(parsed.preview, start=2):
        try:
            service.create_employee(
                EmployeeCreate(
                    first_name=row["nombre"],
                    last_name=row["apellidos"],
                    email=row.get("email") or None,
                    role_title=row.get("puesto") or None,
                    dni=row.get("dni") or None,
                    pin=row.get("pin") or None,
                ),
                actor_user_id=ctx.user.id,
            )
            imported += 1
        except AppError as exc:
            skipped += 1
            errors.append(CsvRowError(row=row_num, field="general", message=exc.detail.message))
        except Exception:
            logger.exception("Unexpected employee CSV import error at row %s.", row_num)
            skipped += 1
            errors.append(CsvRowError(row=row_num, field="general", message="No se pudo importar la fila."))

    return CsvImportResult(imported=imported, skipped=skipped, errors=errors, preview=[])


def _rate_limit_upload(ctx: TenantContext) -> None:
    upload_limiter.check(f"company:{ctx.company_id}:user:{ctx.user.id}")


def _validate_csv_upload(file: UploadFile) -> None:
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    filename = (file.filename or "").strip().lower()
    if content_type not in _CSV_ALLOWED_MIME_TYPES:
        raise ValidationError("Unsupported CSV content type.")
    if filename and not filename.endswith(".csv"):
        raise ValidationError("CSV filename must end with .csv.")


def _parse_csv(content: bytes, *, dry_run: bool) -> CsvImportResult:
    """Validate CSV rows and return a CsvImportResult.

    When dry_run=True, preview contains valid rows without DB checks.
    """
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        return CsvImportResult(
            imported=0,
            skipped=0,
            errors=[CsvRowError(row=0, field="file", message="Empty or unreadable CSV.")],
            preview=[],
        )

    normalized_fields = {f.strip().lower(): f for f in reader.fieldnames}
    missing = _CSV_REQUIRED - set(normalized_fields.keys())
    if missing:
        return CsvImportResult(
            imported=0,
            skipped=0,
            errors=[CsvRowError(row=0, field="header", message=f"Missing required columns: {', '.join(sorted(missing))}")],
            preview=[],
        )

    valid_rows: list[dict[str, str]] = []
    errors: list[CsvRowError] = []
    skipped = 0

    for row_num, raw_row in enumerate(reader, start=2):
        row = {k.strip().lower(): (v or "").strip() for k, v in raw_row.items() if k}
        row_errors: list[CsvRowError] = []

        nombre = row.get("nombre", "")
        apellidos = row.get("apellidos", "")
        email = row.get("email", "")
        pin = row.get("pin", "")

        if not nombre:
            row_errors.append(CsvRowError(row=row_num, field="nombre", message="El nombre es obligatorio."))
        if not apellidos:
            row_errors.append(CsvRowError(row=row_num, field="apellidos", message="Los apellidos son obligatorios."))
        if email and not _EMAIL_RE.match(email):
            row_errors.append(CsvRowError(row=row_num, field="email", message="Email inválido."))
        if pin and (len(pin) != 4 or not pin.isdigit()):
            row_errors.append(CsvRowError(row=row_num, field="pin", message="El PIN debe tener exactamente 4 dígitos."))

        if row_errors:
            errors.extend(row_errors)
            skipped += 1
        else:
            valid_rows.append({
                "nombre": nombre,
                "apellidos": apellidos,
                "email": email,
                "puesto": row.get("puesto", "") or row.get("rol", ""),
                "dni": row.get("dni", ""),
                "pin": pin,
            })

    return CsvImportResult(
        imported=0 if dry_run else len(valid_rows),
        skipped=skipped,
        errors=errors,
        preview=valid_rows if dry_run else [],
    )
