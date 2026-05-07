from pydantic import BaseModel, Field, field_validator

from app.models.enums import PlanType


class CheckoutSessionCreate(BaseModel):
    plan_type: PlanType = Field(description="Paid plan to subscribe to.")


class BillingPortalCreate(BaseModel):
    return_url: str | None = Field(default=None, max_length=2048)

    @field_validator("return_url", mode="before")
    @classmethod
    def strip_return_url(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class BillingRedirectResponse(BaseModel):
    url: str
