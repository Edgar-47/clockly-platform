from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ExpenseCategory, ExpenseEventType, ExpenseStatus, PaymentSource


# ── Create ────────────────────────────────────────────────────────────────────

class ExpenseTicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    category: ExpenseCategory
    purchase_date: date
    amount: Decimal = Field(gt=0, decimal_places=2)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    payment_source: PaymentSource
    requires_reimbursement: bool = False
    reimbursement_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    internal_notes: str | None = Field(default=None, max_length=2000)
    location_id: UUID | None = None
    employee_id: UUID | None = None

    @field_validator("purchase_date")
    @classmethod
    def purchase_date_not_future(cls, v: date) -> date:
        from datetime import date as date_type
        today = date_type.today()
        if v > today:
            raise ValueError("La fecha de compra no puede ser futura.")
        return v

    @field_validator("reimbursement_amount")
    @classmethod
    def reimbursement_requires_flag(cls, v: Decimal | None, info) -> Decimal | None:
        if v is not None and v > 0:
            requires = info.data.get("requires_reimbursement", False)
            if not requires:
                raise ValueError("Indica requires_reimbursement=true para establecer el importe de reembolso.")
        return v


# ── Update ────────────────────────────────────────────────────────────────────

class ExpenseTicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    category: ExpenseCategory | None = None
    purchase_date: date | None = None
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    payment_source: PaymentSource | None = None
    requires_reimbursement: bool | None = None
    reimbursement_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    internal_notes: str | None = None
    location_id: UUID | None = None


# ── Action payloads ───────────────────────────────────────────────────────────

class ExpenseTicketReject(BaseModel):
    rejection_reason: str = Field(min_length=1, max_length=1000)


class ExpenseTicketMarkPaid(BaseModel):
    notes: str | None = Field(default=None, max_length=1000)


# ── Read ──────────────────────────────────────────────────────────────────────

class EmployeeSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    first_name: str
    last_name: str


class UserSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str


class ExpenseTicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    location_id: UUID | None
    employee_id: UUID | None
    created_by_user_id: UUID | None
    title: str
    description: str | None
    category: ExpenseCategory
    purchase_date: date
    amount: Decimal
    currency: str
    payment_source: PaymentSource
    requires_reimbursement: bool
    reimbursement_amount: Decimal | None
    status: ExpenseStatus
    rejection_reason: str | None
    internal_notes: str | None
    approved_by_user_id: UUID | None
    approved_at: datetime | None
    rejected_by_user_id: UUID | None
    rejected_at: datetime | None
    paid_by_user_id: UUID | None
    paid_at: datetime | None
    attachment_key: str | None
    attachment_file_name: str | None
    attachment_mime_type: str | None
    attachment_size: int | None
    created_at: datetime
    updated_at: datetime

    employee: EmployeeSnapshot | None = None
    created_by: UserSnapshot | None = None


class ExpenseTicketListResponse(BaseModel):
    items: list[ExpenseTicketRead]
    total: int
    limit: int
    offset: int


# ── Summary ───────────────────────────────────────────────────────────────────

class ExpenseTicketSummary(BaseModel):
    total_count: int
    total_amount: float
    pending_amount: float
    in_review_amount: float
    approved_amount: float
    rejected_amount: float
    paid_amount: float
    pending_reimbursement_amount: float
    avg_amount: float


# ── Events ────────────────────────────────────────────────────────────────────

class ExpenseTicketEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ticket_id: UUID
    user_id: UUID | None
    event_type: ExpenseEventType
    old_value: str | None
    new_value: str | None
    notes: str | None
    created_at: datetime
