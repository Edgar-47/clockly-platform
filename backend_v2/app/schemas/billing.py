from pydantic import BaseModel, Field

from app.models.enums import PlanType


class CheckoutSessionCreate(BaseModel):
    plan_type: PlanType = Field(description="Paid plan to subscribe to.")


class BillingPortalCreate(BaseModel):
    return_url: str | None = None


class BillingRedirectResponse(BaseModel):
    url: str
