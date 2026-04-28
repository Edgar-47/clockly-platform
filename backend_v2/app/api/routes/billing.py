from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.schemas.billing import BillingPortalCreate, BillingRedirectResponse, CheckoutSessionCreate
from app.services.billing_service import BillingService


router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/checkout", response_model=BillingRedirectResponse)
def create_checkout_session(
    payload: CheckoutSessionCreate,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> BillingRedirectResponse:
    url = BillingService(db).create_checkout_session(
        company_id=ctx.company_id,
        plan_type=payload.plan_type,
        customer_email=ctx.user.email,
    )
    return BillingRedirectResponse(url=url)


@router.post("/portal", response_model=BillingRedirectResponse)
def create_billing_portal_session(
    payload: BillingPortalCreate | None = None,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> BillingRedirectResponse:
    url = BillingService(db).create_portal_session(
        company_id=ctx.company_id,
        return_url=payload.return_url if payload else None,
    )
    return BillingRedirectResponse(url=url)


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    payload = await request.body()
    service = BillingService(db)
    event = service.construct_webhook_event(payload=payload, signature=stripe_signature)
    service.handle_event(event)
    return {"ok": True}
