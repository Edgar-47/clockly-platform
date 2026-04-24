"""Superadmin-only endpoints. Access is restricted to users with the SUPERADMIN role."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies.auth import TenantContext, require_superadmin


router = APIRouter(prefix="/superadmin", tags=["superadmin"])


class SuperadminStatus(BaseModel):
    ok: bool
    user_id: str
    user_email: str
    company_id: str
    company_name: str
    role: str


@router.get("/status", response_model=SuperadminStatus)
def superadmin_status(
    ctx: TenantContext = Depends(require_superadmin()),
) -> SuperadminStatus:
    """Health check endpoint exclusive to superadmin users."""
    return SuperadminStatus(
        ok=True,
        user_id=str(ctx.user.id),
        user_email=ctx.user.email,
        company_id=str(ctx.company_id),
        company_name=ctx.company.name,
        role=ctx.user.role.value,
    )
