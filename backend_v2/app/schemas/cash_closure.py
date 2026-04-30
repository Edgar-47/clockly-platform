from __future__ import annotations

from datetime import date as DateType, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import CashClosureShift


class CashClosureLineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    theoretical_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    real_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)


class CashClosureLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    closure_id: UUID
    name: str
    amount: Decimal = Field(validation_alias="real_amount")
    theoretical_amount: Decimal
    real_amount: Decimal
    sort_order: int


class CashClosureCreate(BaseModel):
    location_id: UUID | None = None
    date: DateType | None = None
    shift: CashClosureShift
    custom_shift_name: str | None = Field(default=None, max_length=80)
    theoretical_total: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    real_total: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    notes: str | None = Field(default=None, max_length=2000)
    incidence_comment: str | None = Field(default=None, max_length=2000)
    cash_drawers: list[CashClosureLineCreate] = Field(default_factory=list, max_length=25)
    card_terminals: list[CashClosureLineCreate] = Field(default_factory=list, max_length=25)

    @model_validator(mode="after")
    def validate_closure(self) -> "CashClosureCreate":
        _validate_shift(self.shift, self.custom_shift_name)
        _validate_lines(self.cash_drawers, self.card_terminals)
        _validate_incidence_comment(
            self.theoretical_total,
            self.real_total,
            self.cash_drawers,
            self.card_terminals,
            self.incidence_comment,
        )
        return self


class CashClosureUpdate(BaseModel):
    location_id: UUID | None = None
    date: DateType | None = None
    shift: CashClosureShift | None = None
    custom_shift_name: str | None = Field(default=None, max_length=80)
    theoretical_total: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    real_total: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    notes: str | None = Field(default=None, max_length=2000)
    incidence_comment: str | None = Field(default=None, max_length=2000)
    cash_drawers: list[CashClosureLineCreate] | None = Field(default=None, max_length=25)
    card_terminals: list[CashClosureLineCreate] | None = Field(default=None, max_length=25)

    @model_validator(mode="after")
    def validate_update(self) -> "CashClosureUpdate":
        if self.shift is not None:
            _validate_shift(self.shift, self.custom_shift_name)
        return self


class UserSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str


class LocationSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class CashClosureRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    location_id: UUID | None
    date: DateType
    shift: CashClosureShift
    custom_shift_name: str | None
    closed_by_user_id: UUID | None
    notes: str | None
    theoretical_total: Decimal
    real_total: Decimal
    balance: Decimal
    has_incidence: bool
    incidence_amount: Decimal
    incidence_comment: str | None
    signature_name: str
    signed_at: datetime
    locked_at: datetime
    last_edited_by_user_id: UUID | None
    last_edited_at: datetime | None
    created_at: datetime
    updated_at: datetime
    closed_by: UserSnapshot | None = None
    location: LocationSnapshot | None = None
    cash_drawers: list[CashClosureLineRead] = Field(default_factory=list)
    card_terminals: list[CashClosureLineRead] = Field(default_factory=list)


class CashClosureListResponse(BaseModel):
    items: list[CashClosureRead]
    total: int
    limit: int
    offset: int


class CashClosureStats(BaseModel):
    closure_count: int
    total_theoretical: Decimal
    total_real: Decimal
    total_balance: Decimal
    cash_total: Decimal
    card_total: Decimal
    incidence_count: int
    incidence_amount_total: Decimal
    avg_real_total: Decimal


class CashClosureRevenuePoint(BaseModel):
    label: str
    theoretical_total: Decimal
    real_total: Decimal
    cash_total: Decimal
    card_total: Decimal
    balance: Decimal
    incidence_count: int


class CashClosureEmployeeIncidenceRank(BaseModel):
    user_id: UUID | None
    user_name: str
    closure_count: int
    incidence_count: int
    incidence_amount: Decimal


class CashClosurePaymentMix(BaseModel):
    cash_total: Decimal
    card_total: Decimal


class CashClosureChartsResponse(BaseModel):
    revenue_by_period: list[CashClosureRevenuePoint]
    theoretical_vs_real: list[CashClosureRevenuePoint]
    balance_evolution: list[CashClosureRevenuePoint]
    payment_mix: CashClosurePaymentMix
    top_incidence_users: list[CashClosureEmployeeIncidenceRank]


class CashClosurePrefillResponse(BaseModel):
    date: DateType
    shift: CashClosureShift
    location_id: UUID | None
    source: str
    supports_external_sales: bool
    theoretical_total: Decimal
    real_total: Decimal
    cash_drawers: list[CashClosureLineCreate]
    card_terminals: list[CashClosureLineCreate]


def _validate_shift(shift: CashClosureShift, custom_shift_name: str | None) -> None:
    if shift == CashClosureShift.CUSTOM and not (custom_shift_name or "").strip():
        raise ValueError("custom_shift_name is required for custom shift.")


def _validate_lines(
    cash_drawers: list[CashClosureLineCreate],
    card_terminals: list[CashClosureLineCreate],
) -> None:
    if not cash_drawers and not card_terminals:
        raise ValueError("At least one cash drawer or card terminal is required.")


def _validate_incidence_comment(
    theoretical_total: Decimal | None,
    real_total: Decimal | None,
    cash_drawers: list[CashClosureLineCreate],
    card_terminals: list[CashClosureLineCreate],
    incidence_comment: str | None,
) -> None:
    theoretical, real = _closure_totals(theoretical_total, real_total, cash_drawers, card_terminals)
    if real != theoretical and not (incidence_comment or "").strip():
        raise ValueError("incidence_comment is required when balance is not zero.")


def _closure_totals(
    theoretical_total: Decimal | None,
    real_total: Decimal | None,
    cash_drawers: list[CashClosureLineCreate],
    card_terminals: list[CashClosureLineCreate],
) -> tuple[Decimal, Decimal]:
    if theoretical_total is not None and real_total is not None:
        return theoretical_total, real_total
    theoretical = sum((_line_theoretical(line) for line in cash_drawers), Decimal("0.00"))
    theoretical += sum((_line_theoretical(line) for line in card_terminals), Decimal("0.00"))
    real = sum((_line_amount(line) for line in cash_drawers), Decimal("0.00"))
    real += sum((_line_amount(line) for line in card_terminals), Decimal("0.00"))
    return theoretical, real


def _line_amount(line: CashClosureLineCreate) -> Decimal:
    return line.amount if line.amount is not None else line.real_amount or Decimal("0.00")


def _line_theoretical(line: CashClosureLineCreate) -> Decimal:
    return line.theoretical_amount or Decimal("0.00")
