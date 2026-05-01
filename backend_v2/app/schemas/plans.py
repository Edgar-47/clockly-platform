from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import PlanType


class PlanFeatures(BaseModel):
    has_exports: bool
    has_advanced_filters: bool
    has_multi_location: bool
    has_geolocation: bool
    has_admin_reports: bool
    has_support: bool


class PlanDefinitionRead(BaseModel):
    code: PlanType
    name: str
    description: str
    max_employees: int | None
    has_exports: bool
    has_advanced_filters: bool
    has_multi_location: bool
    has_geolocation: bool
    has_admin_reports: bool
    has_support: bool
    cta_label: str
    recommended: bool
    custom_onboarding: bool
    features: PlanFeatures
    feature_labels: list[str]


class PlanListResponse(BaseModel):
    items: list[PlanDefinitionRead]


class CompanyPlanContext(BaseModel):
    plan_type: PlanType
    plan_name: str
    max_employees: int | None
    has_exports: bool
    has_advanced_filters: bool
    has_multi_location: bool
    has_geolocation: bool
    has_admin_reports: bool
    has_support: bool
    trial_ends_at: datetime | None
    is_active_subscription: bool
    is_beta_user: bool
    stripe_subscription_status: str | None
    stripe_current_period_end: datetime | None
    stripe_cancel_at_period_end: bool
    created_by: UUID | None
