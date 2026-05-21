from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.board import BoardLabel, BoardNote
from app.models.enums import BoardNotePriority, BoardNoteStatus


class BoardNoteRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    def list(
        self,
        *,
        status: BoardNoteStatus | None = None,
        priority: BoardNotePriority | None = None,
        label_id: UUID | None = None,
        search: str | None = None,
        include_archived: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> list[BoardNote]:
        statement = self._filtered_statement(
            status=status,
            priority=priority,
            label_id=label_id,
            search=search,
            include_archived=include_archived,
        ).options(
            selectinload(BoardNote.labels),
            joinedload(BoardNote.author),
        )
        statement = statement.order_by(
            BoardNote.reminder_at.is_(None),
            BoardNote.reminder_at.asc(),
            BoardNote.created_at.desc(),
        ).offset(offset).limit(limit)
        return list(self.db.scalars(statement).unique())

    def count(
        self,
        *,
        status: BoardNoteStatus | None = None,
        priority: BoardNotePriority | None = None,
        label_id: UUID | None = None,
        search: str | None = None,
        include_archived: bool = False,
    ) -> int:
        statement = self._filtered_statement(
            status=status,
            priority=priority,
            label_id=label_id,
            search=search,
            include_archived=include_archived,
        )
        return int(self.db.scalar(select(func.count()).select_from(statement.subquery())) or 0)

    def get(self, note_id: UUID) -> BoardNote | None:
        return self.db.scalar(
            select(BoardNote)
            .where(BoardNote.id == note_id, BoardNote.company_id == self.company_id)
            .options(selectinload(BoardNote.labels), joinedload(BoardNote.author))
        )

    def add(self, note: BoardNote) -> BoardNote:
        self.db.add(note)
        self.db.flush()
        return note

    def delete(self, note: BoardNote) -> None:
        self.db.delete(note)
        self.db.flush()

    def _filtered_statement(
        self,
        *,
        status: BoardNoteStatus | None,
        priority: BoardNotePriority | None,
        label_id: UUID | None,
        search: str | None,
        include_archived: bool,
    ):
        statement = select(BoardNote).where(BoardNote.company_id == self.company_id)
        if status is not None:
            statement = statement.where(BoardNote.status == status)
        elif not include_archived:
            statement = statement.where(BoardNote.status != BoardNoteStatus.ARCHIVED)
        if priority is not None:
            statement = statement.where(BoardNote.priority == priority)
        if label_id is not None:
            statement = statement.where(BoardNote.labels.any(BoardLabel.id == label_id))
        if search:
            term = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    BoardNote.title.ilike(term),
                    BoardNote.content.ilike(term),
                )
            )
        return statement


class BoardLabelRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    def list(self) -> list[BoardLabel]:
        return list(
            self.db.scalars(
                select(BoardLabel)
                .where(BoardLabel.company_id == self.company_id)
                .order_by(func.lower(BoardLabel.name).asc())
            )
        )

    def count(self) -> int:
        return int(
            self.db.scalar(
                select(func.count(BoardLabel.id)).where(BoardLabel.company_id == self.company_id)
            )
            or 0
        )

    def get(self, label_id: UUID) -> BoardLabel | None:
        return self.db.scalar(
            select(BoardLabel).where(
                BoardLabel.id == label_id,
                BoardLabel.company_id == self.company_id,
            )
        )

    def get_by_name(self, name: str) -> BoardLabel | None:
        return self.db.scalar(
            select(BoardLabel).where(
                BoardLabel.company_id == self.company_id,
                func.lower(BoardLabel.name) == name.strip().lower(),
            )
        )

    def list_by_ids(self, label_ids: list[UUID]) -> list[BoardLabel]:
        unique_ids = list(dict.fromkeys(label_ids))
        if not unique_ids:
            return []
        return list(
            self.db.scalars(
                select(BoardLabel).where(
                    BoardLabel.company_id == self.company_id,
                    BoardLabel.id.in_(unique_ids),
                )
            )
        )

    def usage_count(self, label: BoardLabel) -> int:
        return int(
            self.db.scalar(
                select(func.count(BoardNote.id)).where(
                    BoardNote.company_id == self.company_id,
                    BoardNote.labels.any(BoardLabel.id == label.id),
                )
            )
            or 0
        )

    def add(self, label: BoardLabel) -> BoardLabel:
        self.db.add(label)
        self.db.flush()
        return label

    def delete(self, label: BoardLabel) -> None:
        self.db.delete(label)
        self.db.flush()
