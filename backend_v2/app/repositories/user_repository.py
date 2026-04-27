from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken
from app.models.enums import UserRole
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, user_id: UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_by_id_in_company(self, user_id: UUID, company_id: UUID) -> User | None:
        """Return user regardless of is_active, scoped to company. Used for admin sync operations."""
        return self.db.scalar(
            select(User).where(
                User.id == user_id,
                User.company_id == company_id,
            )
        )

    def get_active(self, user_id: UUID, company_id: UUID) -> User | None:
        return self.db.scalar(
            select(User).where(
                User.id == user_id,
                User.company_id == company_id,
                User.is_active.is_(True),
            )
        )

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def list_by_company(
        self,
        company_id: UUID,
        *,
        include_inactive: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[User]:
        stmt = select(User).where(User.company_id == company_id)
        if not include_inactive:
            stmt = stmt.where(User.is_active.is_(True))
        return list(self.db.scalars(
            stmt.order_by(User.created_at.desc()).offset(offset).limit(limit)
        ))

    def count_by_company(self, company_id: UUID, *, include_inactive: bool = False) -> int:
        stmt = select(func.count(User.id)).where(User.company_id == company_id)
        if not include_inactive:
            stmt = stmt.where(User.is_active.is_(True))
        return int(self.db.scalar(stmt) or 0)

    def count_by_company_and_role(
        self,
        company_id: UUID,
        role: UserRole,
        *,
        include_inactive: bool = False,
    ) -> int:
        stmt = select(func.count(User.id)).where(
            User.company_id == company_id,
            User.role == role,
        )
        if not include_inactive:
            stmt = stmt.where(User.is_active.is_(True))
        return int(self.db.scalar(stmt) or 0)

    def add(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        return user

    def mark_login(self, user: User) -> None:
        user.last_login_at = datetime.now(UTC)
        self.db.add(user)

    def add_refresh_token(self, refresh_token: RefreshToken) -> RefreshToken:
        self.db.add(refresh_token)
        self.db.flush()
        return refresh_token

    def get_refresh_token(self, token_hash: str) -> RefreshToken | None:
        return self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))

    def revoke_refresh_token(
        self,
        refresh_token: RefreshToken,
        *,
        replacement_id: UUID | None = None,
    ) -> None:
        refresh_token.revoked_at = datetime.now(UTC)
        refresh_token.replaced_by_token_id = replacement_id
        self.db.add(refresh_token)
