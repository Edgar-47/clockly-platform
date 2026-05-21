from __future__ import annotations

import uuid
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.board import BOARD_LABEL_COLORS, BoardLabel, BoardNote
from app.models.enums import BoardNoteStatus
from app.repositories.board_repository import BoardLabelRepository, BoardNoteRepository
from app.schemas.board import BoardLabelCreate, BoardLabelUpdate, BoardNoteCreate, BoardNoteUpdate


DEFAULT_BOARD_LABELS: tuple[tuple[str, str, str], ...] = (
    ("Recordatorio", "blue", "Seguimientos y avisos con fecha."),
    ("Trabajo pendiente", "orange", "Tareas que quedan por cerrar."),
    ("Incidencia", "red", "Situaciones operativas no criticas."),
    ("Importante", "purple", "Notas que necesitan atencion prioritaria."),
    ("Operacion diaria", "green", "Notas rapidas del dia a dia."),
)


class BoardService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.note_repo = BoardNoteRepository(db, company_id=company_id)
        self.label_repo = BoardLabelRepository(db, company_id=company_id)

    def ensure_default_labels(self, *, actor_user_id: UUID | None) -> None:
        if self.label_repo.count() > 0:
            return
        for name, color, description in DEFAULT_BOARD_LABELS:
            self.label_repo.add(
                BoardLabel(
                    id=uuid.uuid4(),
                    company_id=self.company_id,
                    name=name,
                    color=color,
                    description=description,
                    created_by_user_id=actor_user_id,
                )
            )
        self.db.commit()

    def create_label(self, payload: BoardLabelCreate, *, actor_user_id: UUID | None) -> BoardLabel:
        self._assert_label_name_available(payload.name)
        label = BoardLabel(
            id=uuid.uuid4(),
            company_id=self.company_id,
            name=payload.name,
            color=payload.color,
            description=payload.description,
            created_by_user_id=actor_user_id,
        )
        try:
            self.label_repo.add(label)
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("Ya existe una etiqueta con ese nombre.") from exc
        return label

    def update_label(self, label_id: UUID, payload: BoardLabelUpdate) -> BoardLabel:
        label = self.label_repo.get(label_id)
        if label is None:
            raise NotFoundError("Etiqueta no encontrada.")

        update_data = payload.model_dump(exclude_unset=True)
        if "name" in update_data and payload.name != label.name:
            self._assert_label_name_available(payload.name or "", ignore_id=label.id)
            label.name = payload.name or label.name
        if "color" in update_data and payload.color is not None:
            if payload.color not in BOARD_LABEL_COLORS:
                raise ConflictError("Color de etiqueta no valido.")
            label.color = payload.color
        if "description" in update_data:
            label.description = payload.description

        try:
            self.db.add(label)
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("Ya existe una etiqueta con ese nombre.") from exc
        return label

    def delete_label(self, label_id: UUID) -> None:
        label = self.label_repo.get(label_id)
        if label is None:
            raise NotFoundError("Etiqueta no encontrada.")
        if self.label_repo.usage_count(label) > 0:
            # Conservative deletion strategy: keep historical note context intact.
            raise ConflictError("No se puede eliminar una etiqueta que esta en uso.")
        self.label_repo.delete(label)
        self.db.commit()

    def create_note(self, payload: BoardNoteCreate, *, actor_user_id: UUID | None) -> BoardNote:
        labels = self._labels_for_payload(payload.label_ids)
        now = datetime.now(UTC)
        note = BoardNote(
            id=uuid.uuid4(),
            company_id=self.company_id,
            title=payload.title,
            content=payload.content,
            status=payload.status,
            priority=payload.priority,
            reminder_at=payload.reminder_at,
            completed_at=now if payload.status == BoardNoteStatus.COMPLETED else None,
            archived_at=now if payload.status == BoardNoteStatus.ARCHIVED else None,
            created_by_user_id=actor_user_id,
            labels=labels,
        )
        self.note_repo.add(note)
        self.db.commit()
        return self.note_repo.get(note.id) or note

    def update_note(self, note_id: UUID, payload: BoardNoteUpdate) -> BoardNote:
        note = self.note_repo.get(note_id)
        if note is None:
            raise NotFoundError("Nota no encontrada.")

        update_data = payload.model_dump(exclude_unset=True)
        if "title" in update_data and payload.title is not None:
            note.title = payload.title
        if "content" in update_data:
            note.content = payload.content
        if "priority" in update_data and payload.priority is not None:
            note.priority = payload.priority
        if "reminder_at" in update_data:
            note.reminder_at = payload.reminder_at
        if "label_ids" in update_data and payload.label_ids is not None:
            note.labels = self._labels_for_payload(payload.label_ids)
        if "status" in update_data and payload.status is not None:
            self._apply_status(note, payload.status)

        self.db.add(note)
        self.db.commit()
        return self.note_repo.get(note.id) or note

    def complete_note(self, note_id: UUID) -> BoardNote:
        note = self.note_repo.get(note_id)
        if note is None:
            raise NotFoundError("Nota no encontrada.")
        self._apply_status(note, BoardNoteStatus.COMPLETED)
        self.db.add(note)
        self.db.commit()
        return self.note_repo.get(note.id) or note

    def archive_note(self, note_id: UUID) -> BoardNote:
        note = self.note_repo.get(note_id)
        if note is None:
            raise NotFoundError("Nota no encontrada.")
        self._apply_status(note, BoardNoteStatus.ARCHIVED)
        self.db.add(note)
        self.db.commit()
        return self.note_repo.get(note.id) or note

    def delete_note(self, note_id: UUID) -> None:
        note = self.note_repo.get(note_id)
        if note is None:
            raise NotFoundError("Nota no encontrada.")
        self.note_repo.delete(note)
        self.db.commit()

    def _labels_for_payload(self, label_ids: list[UUID]) -> list[BoardLabel]:
        unique_ids = list(dict.fromkeys(label_ids))
        labels = self.label_repo.list_by_ids(unique_ids)
        if len(labels) != len(unique_ids):
            raise NotFoundError("Una o mas etiquetas no existen para esta empresa.")
        return labels

    def _assert_label_name_available(self, name: str, *, ignore_id: UUID | None = None) -> None:
        existing = self.label_repo.get_by_name(name)
        if existing is not None and existing.id != ignore_id:
            raise ConflictError("Ya existe una etiqueta con ese nombre.")

    def _apply_status(self, note: BoardNote, status: BoardNoteStatus) -> None:
        now = datetime.now(UTC)
        note.status = status
        if status == BoardNoteStatus.COMPLETED and note.completed_at is None:
            note.completed_at = now
        if status != BoardNoteStatus.COMPLETED:
            note.completed_at = None
        if status == BoardNoteStatus.ARCHIVED and note.archived_at is None:
            note.archived_at = now
        if status != BoardNoteStatus.ARCHIVED:
            note.archived_at = None
