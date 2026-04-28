from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.password_reset_token import PasswordResetToken


class PasswordResetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, token: PasswordResetToken) -> PasswordResetToken:
        self.db.add(token)
        self.db.flush()
        return token

    def get_by_token_hash(self, token_hash: str) -> PasswordResetToken | None:
        return self.db.scalar(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )

    def mark_unused_for_user_used(self, user_id) -> int:
        tokens = list(
            self.db.scalars(
                select(PasswordResetToken).where(
                    PasswordResetToken.user_id == user_id,
                    PasswordResetToken.used_at.is_(None),
                )
            )
        )
        now = datetime.now(UTC)
        for token in tokens:
            token.used_at = now
            self.db.add(token)
        return len(tokens)
