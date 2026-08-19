"""User role and activation management.

Rules enforced here:
- SUPERADMIN cannot be assigned via any client-facing API endpoint.
- OWNER accounts can only be managed by SUPERADMIN.
- ADMIN can manage roles up to MANAGER; cannot touch OWNER or other ADMINs.
- OWNER can manage roles up to ADMIN.
- No one can change their own role or activation status.
- All operations are scoped to the actor's company.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, PermissionDenied
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserRoleUpdate

logger = logging.getLogger(__name__)

# Roles each actor level is allowed to assign/change-to
_MAX_ASSIGNABLE: dict[UserRole, set[UserRole]] = {
    UserRole.SUPERADMIN: {UserRole.OWNER, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE},
    UserRole.OWNER: {UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE},
    UserRole.ADMIN: {UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE},
    UserRole.HR_MANAGER: {UserRole.EMPLOYEE},
}

# Roles whose holder cannot be modified below OWNER level
_PROTECTED_ROLES = {UserRole.SUPERADMIN, UserRole.OWNER}


def _assert_can_assign_role(actor_role: UserRole, target_role: UserRole) -> None:
    allowed = _MAX_ASSIGNABLE.get(actor_role, set())
    if target_role not in allowed:
        raise PermissionDenied(
            f"Your role ({actor_role.value}) cannot assign the role '{target_role.value}'."
        )


def _assert_can_manage_user(actor: User, target: User) -> None:
    if actor.id == target.id:
        raise PermissionDenied("You cannot modify your own role or activation status.")
    if actor.role == UserRole.SUPERADMIN:
        return
    if target.role in _PROTECTED_ROLES and actor.role != UserRole.SUPERADMIN:
        raise PermissionDenied(
            "Owner and superadmin accounts cannot be modified via this endpoint."
        )
    allowed_targets = _MAX_ASSIGNABLE.get(actor.role, set())
    if target.role not in allowed_targets:
        raise PermissionDenied(
            f"Your role ({actor.role.value}) cannot modify '{target.role.value}' users."
        )


class UserService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.repo = UserRepository(db)

    def list_users(
        self,
        *,
        include_inactive: bool = False,
        include_deleted: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[User], int]:
        items = self.repo.list_by_company(
            self.company_id,
            include_inactive=include_inactive,
            include_deleted=include_deleted,
            limit=limit,
            offset=offset,
        )
        total = self.repo.count_by_company(
            self.company_id,
            include_inactive=include_inactive,
            include_deleted=include_deleted,
        )
        return items, total

    def get_user(self, user_id: UUID) -> User:
        user = self.repo.get_by_id_in_company(user_id, self.company_id)
        if user is None:
            raise NotFoundError("User not found.")
        return user

    def create_user(self, payload: UserCreate, *, actor: User) -> User:
        _assert_can_assign_role(actor.role, payload.role)

        if self.repo.get_by_email(payload.email) is not None:
            raise ConflictError("A user with this email already exists.")

        user = User(
            company_id=self.company_id,
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            role=payload.role,
            is_active=True,
        )
        try:
            self.repo.add(user)
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("A user with this email already exists.") from exc

        logger.info(
            "[UserService] Created user id=%s role=%s (actor=%s)", user.id, user.role.value, actor.id
        )
        return user

    def change_role(self, user_id: UUID, payload: UserRoleUpdate, *, actor: User) -> User:
        target = self.get_user(user_id)
        _assert_can_manage_user(actor, target)
        _assert_can_assign_role(actor.role, payload.role)

        old_role = target.role
        target.role = payload.role
        self.db.add(target)
        self.db.commit()
        logger.info(
            "[UserService] Role changed user=%s: %s → %s (actor=%s)",
            user_id,
            old_role.value,
            payload.role.value,
            actor.id,
        )
        return target

    def set_active(self, user_id: UUID, *, is_active: bool, actor: User) -> User:
        target = self.get_user(user_id)
        _assert_can_manage_user(actor, target)

        target.is_active = is_active
        if not is_active:
            self.repo.revoke_active_refresh_tokens_for_user(target.id)
        self.db.add(target)
        self.db.commit()
        logger.info(
            "[UserService] User id=%s set is_active=%s (actor=%s)", user_id, is_active, actor.id
        )
        return target

    def soft_delete_user(self, user_id: UUID, *, actor: User) -> User:
        target = self.get_user(user_id)
        _assert_can_manage_user(actor, target)

        now = datetime.now(UTC)
        target.is_active = False
        target.is_deleted = True
        target.deleted_at = now
        target.deleted_by = actor.id
        self.repo.revoke_active_refresh_tokens_for_user(target.id)
        self.db.add(target)
        self.db.commit()
        logger.info(
            "[UserService] Soft-deleted user id=%s (actor=%s)", user_id, actor.id
        )
        return target
