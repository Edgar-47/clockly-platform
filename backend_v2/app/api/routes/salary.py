from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.schemas.salary import (
    SalaryCalculationGenerateRequest,
    SalaryCalculationRead,
    SalaryCalculationStoredRead,
    SalaryProfileCreate,
    SalaryProfileListResponse,
    SalaryProfileRead,
    SalaryProfileUpdate,
)
from app.services.salary_service import SalaryService


router = APIRouter(tags=["salary"])


@router.get("/salary-profiles", response_model=SalaryProfileListResponse)
def list_salary_profiles(
    employee_id: UUID | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("salary:read")),
    db: Session = Depends(get_db),
) -> SalaryProfileListResponse:
    profiles = SalaryService(db, company_id=ctx.company_id).list_profiles(employee_id=employee_id)
    return SalaryProfileListResponse(items=profiles)


@router.post("/salary-profiles", response_model=SalaryProfileRead, status_code=status.HTTP_201_CREATED)
def create_salary_profile(
    payload: SalaryProfileCreate,
    ctx: TenantContext = Depends(require_permission("salary:manage")),
    db: Session = Depends(get_db),
) -> SalaryProfileRead:
    return SalaryService(db, company_id=ctx.company_id).create_profile(payload, actor=ctx.user)


@router.get("/salary-profiles/{employee_id}", response_model=SalaryProfileListResponse)
def get_employee_salary_profiles(
    employee_id: UUID,
    ctx: TenantContext = Depends(require_permission("salary:read")),
    db: Session = Depends(get_db),
) -> SalaryProfileListResponse:
    profiles = SalaryService(db, company_id=ctx.company_id).get_profiles_for_employee(employee_id)
    return SalaryProfileListResponse(items=profiles)


@router.patch("/salary-profiles/{profile_id}", response_model=SalaryProfileRead)
def update_salary_profile(
    profile_id: UUID,
    payload: SalaryProfileUpdate,
    ctx: TenantContext = Depends(require_permission("salary:manage")),
    db: Session = Depends(get_db),
) -> SalaryProfileRead:
    return SalaryService(db, company_id=ctx.company_id).update_profile(profile_id, payload, actor=ctx.user)


@router.get("/salary-calculations", response_model=SalaryCalculationRead)
def calculate_salary(
    employee_id: UUID = Query(...),
    period_start: date = Query(..., alias="from"),
    period_end: date = Query(..., alias="to"),
    ctx: TenantContext = Depends(require_permission("salary:read")),
    db: Session = Depends(get_db),
) -> SalaryCalculationRead:
    return SalaryService(db, company_id=ctx.company_id).calculate(
        employee_id=employee_id,
        period_start=period_start,
        period_end=period_end,
    )


@router.post("/salary-calculations/generate", response_model=SalaryCalculationStoredRead)
def generate_salary_calculation(
    payload: SalaryCalculationGenerateRequest,
    ctx: TenantContext = Depends(require_permission("salary:manage")),
    db: Session = Depends(get_db),
) -> SalaryCalculationStoredRead:
    return SalaryService(db, company_id=ctx.company_id).generate(payload, actor=ctx.user)
