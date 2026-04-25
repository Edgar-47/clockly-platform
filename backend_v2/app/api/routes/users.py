"""User management endpoints — admin/owner only.

These endpoints manage the User table (login accounts with roles).
They are separate from /employees which manages the Employee table
(clock-in profiles with PINs, schedules, DNI, etc.).

Permission matrix:
  OWNER   → can create/manage ADMIN, MANAGER, EMPLOYEE accounts
  ADMIN   → can create/manage MANAGER, EMPLOYEE accounts
  MANAGER → no access (403)
  EMPLOYEE → no access (403)
  SUPERADMIN → full access
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.schemas.user import UserCreate, UserListResponse, UserRead, UserRoleUpdate
from app.services.user_service import UserService


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
def list_users(
    include_inactive: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> UserListResponse:
    items, total = UserService(db, company_id=ctx.company_id).list_users(
        include_inactive=include_inactive,
        limit=limit,
        offset=offset,
    )
    return UserListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: UUID,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> UserRead:
    return UserService(db, company_id=ctx.company_id).get_user(user_id)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> UserRead:
    return UserService(db, company_id=ctx.company_id).create_user(payload, actor=ctx.user)


@router.patch("/{user_id}/role", response_model=UserRead)
def change_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> UserRead:
    return UserService(db, company_id=ctx.company_id).change_role(user_id, payload, actor=ctx.user)


@router.patch("/{user_id}/activate", response_model=UserRead)
def activate_user(
    user_id: UUID,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> UserRead:
    return UserService(db, company_id=ctx.company_id).set_active(
        user_id, is_active=True, actor=ctx.user
    )


@router.patch("/{user_id}/deactivate", response_model=UserRead)
def deactivate_user(
    user_id: UUID,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> UserRead:
    return UserService(db, company_id=ctx.company_id).set_active(
        user_id, is_active=False, actor=ctx.user
    )
