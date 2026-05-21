from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.enums import BoardNotePriority, BoardNoteStatus
from app.repositories.board_repository import BoardLabelRepository, BoardNoteRepository
from app.schemas.board import (
    BoardLabelCreate,
    BoardLabelListResponse,
    BoardLabelRead,
    BoardLabelUpdate,
    BoardNoteCreate,
    BoardNoteListResponse,
    BoardNoteRead,
    BoardNoteUpdate,
)
from app.services.board_service import BoardService


router = APIRouter(prefix="/board", tags=["board"])


@router.get("/notes", response_model=BoardNoteListResponse)
def list_board_notes(
    note_status: BoardNoteStatus | None = Query(default=None, alias="status"),
    priority: BoardNotePriority | None = Query(default=None),
    label_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None, max_length=120),
    include_archived: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("board:read")),
    db: Session = Depends(get_db),
) -> BoardNoteListResponse:
    repo = BoardNoteRepository(db, company_id=ctx.company_id)
    filter_kwargs = dict(
        status=note_status,
        priority=priority,
        label_id=label_id,
        search=search,
        include_archived=include_archived,
    )
    items = repo.list(**filter_kwargs, limit=limit, offset=offset)
    total = repo.count(**filter_kwargs)
    return BoardNoteListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/notes", response_model=BoardNoteRead, status_code=status.HTTP_201_CREATED)
def create_board_note(
    payload: BoardNoteCreate,
    ctx: TenantContext = Depends(require_permission("board:write")),
    db: Session = Depends(get_db),
) -> BoardNoteRead:
    return BoardService(db, company_id=ctx.company_id).create_note(
        payload,
        actor_user_id=ctx.user.id,
    )


@router.get("/notes/{note_id}", response_model=BoardNoteRead)
def get_board_note(
    note_id: UUID,
    ctx: TenantContext = Depends(require_permission("board:read")),
    db: Session = Depends(get_db),
) -> BoardNoteRead:
    note = BoardNoteRepository(db, company_id=ctx.company_id).get(note_id)
    if note is None:
        raise NotFoundError("Nota no encontrada.")
    return note


@router.patch("/notes/{note_id}", response_model=BoardNoteRead)
def update_board_note(
    note_id: UUID,
    payload: BoardNoteUpdate,
    ctx: TenantContext = Depends(require_permission("board:write")),
    db: Session = Depends(get_db),
) -> BoardNoteRead:
    return BoardService(db, company_id=ctx.company_id).update_note(note_id, payload)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board_note(
    note_id: UUID,
    ctx: TenantContext = Depends(require_permission("board:write")),
    db: Session = Depends(get_db),
) -> Response:
    BoardService(db, company_id=ctx.company_id).delete_note(note_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/notes/{note_id}/complete", response_model=BoardNoteRead)
def complete_board_note(
    note_id: UUID,
    ctx: TenantContext = Depends(require_permission("board:write")),
    db: Session = Depends(get_db),
) -> BoardNoteRead:
    return BoardService(db, company_id=ctx.company_id).complete_note(note_id)


@router.patch("/notes/{note_id}/archive", response_model=BoardNoteRead)
def archive_board_note(
    note_id: UUID,
    ctx: TenantContext = Depends(require_permission("board:write")),
    db: Session = Depends(get_db),
) -> BoardNoteRead:
    return BoardService(db, company_id=ctx.company_id).archive_note(note_id)


@router.get("/labels", response_model=BoardLabelListResponse)
def list_board_labels(
    ctx: TenantContext = Depends(require_permission("board:read")),
    db: Session = Depends(get_db),
) -> BoardLabelListResponse:
    service = BoardService(db, company_id=ctx.company_id)
    service.ensure_default_labels(actor_user_id=ctx.user.id)
    repo = BoardLabelRepository(db, company_id=ctx.company_id)
    labels = repo.list()
    return BoardLabelListResponse(items=labels, total=len(labels))


@router.post("/labels", response_model=BoardLabelRead, status_code=status.HTTP_201_CREATED)
def create_board_label(
    payload: BoardLabelCreate,
    ctx: TenantContext = Depends(require_permission("board:write")),
    db: Session = Depends(get_db),
) -> BoardLabelRead:
    return BoardService(db, company_id=ctx.company_id).create_label(
        payload,
        actor_user_id=ctx.user.id,
    )


@router.patch("/labels/{label_id}", response_model=BoardLabelRead)
def update_board_label(
    label_id: UUID,
    payload: BoardLabelUpdate,
    ctx: TenantContext = Depends(require_permission("board:write")),
    db: Session = Depends(get_db),
) -> BoardLabelRead:
    return BoardService(db, company_id=ctx.company_id).update_label(label_id, payload)


@router.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board_label(
    label_id: UUID,
    ctx: TenantContext = Depends(require_permission("board:write")),
    db: Session = Depends(get_db),
) -> Response:
    BoardService(db, company_id=ctx.company_id).delete_label(label_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
