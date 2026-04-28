from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ConflictError, NotFoundError
from app.models.company import Company
from app.models.enums import PlanType
from app.repositories.company_repository import CompanyRepository
from app.services.plans import apply_plan_to_company


STRIPE_API_VERSION = "2026-02-25.clover"
ACTIVE_SUBSCRIPTION_STATUSES = {"active", "trialing"}


class BillingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.companies = CompanyRepository(db)

    def create_checkout_session(
        self,
        *,
        company_id: UUID,
        plan_type: PlanType,
        customer_email: str,
    ) -> str:
        company = self._company(company_id)
        if plan_type == PlanType.FREE:
            raise ConflictError("Free plan does not require checkout.")
        price_id = self._price_id(plan_type)
        stripe = self._stripe()

        params = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": get_settings().billing_success_url,
            "cancel_url": get_settings().billing_cancel_url,
            "client_reference_id": str(company.id),
            "metadata": {"company_id": str(company.id), "plan_type": plan_type.value},
            "subscription_data": {"metadata": {"company_id": str(company.id), "plan_type": plan_type.value}},
        }
        if company.stripe_customer_id:
            params["customer"] = company.stripe_customer_id
        else:
            params["customer_email"] = customer_email

        session = stripe.checkout.Session.create(**params)
        return session.url

    def create_portal_session(self, *, company_id: UUID, return_url: str | None = None) -> str:
        company = self._company(company_id)
        if not company.stripe_customer_id:
            raise ConflictError("Company does not have a Stripe customer yet.")
        stripe = self._stripe()
        session = stripe.billing_portal.Session.create(
            customer=company.stripe_customer_id,
            return_url=return_url or get_settings().billing_success_url,
        )
        return session.url

    def construct_webhook_event(self, *, payload: bytes, signature: str | None):
        settings = get_settings()
        if not settings.stripe_webhook_secret:
            raise ConflictError("Stripe webhook secret is not configured.")
        stripe = self._stripe()
        try:
            return stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
        except Exception as exc:
            raise ConflictError("Invalid Stripe webhook payload.") from exc

    def handle_event(self, event) -> None:
        event_type = event["type"]
        data = event["data"]["object"]

        if event_type == "checkout.session.completed":
            self._handle_checkout_completed(data)
        elif event_type in {"customer.subscription.created", "customer.subscription.updated"}:
            self._handle_subscription_upsert(data)
        elif event_type == "customer.subscription.deleted":
            self._handle_subscription_deleted(data)
        self.db.commit()

    def _handle_checkout_completed(self, session) -> None:
        company_id = session.get("client_reference_id") or session.get("metadata", {}).get("company_id")
        if not company_id:
            return
        company = self._company(UUID(str(company_id)))
        company.stripe_customer_id = session.get("customer") or company.stripe_customer_id
        company.stripe_subscription_id = session.get("subscription") or company.stripe_subscription_id
        self.db.add(company)

    def _handle_subscription_upsert(self, subscription) -> None:
        company = self._company_for_subscription(subscription)
        company.stripe_customer_id = subscription.get("customer") or company.stripe_customer_id
        company.stripe_subscription_id = subscription.get("id") or company.stripe_subscription_id
        company.stripe_subscription_status = subscription.get("status")
        company.is_active_subscription = subscription.get("status") in ACTIVE_SUBSCRIPTION_STATUSES

        plan_type = self._plan_from_subscription(subscription)
        if plan_type and company.is_active_subscription:
            apply_plan_to_company(company, plan_type)
        self.db.add(company)

    def _handle_subscription_deleted(self, subscription) -> None:
        company = self._company_for_subscription(subscription)
        company.stripe_subscription_id = subscription.get("id") or company.stripe_subscription_id
        company.stripe_subscription_status = subscription.get("status") or "canceled"
        company.is_active_subscription = False
        apply_plan_to_company(company, PlanType.FREE)
        self.db.add(company)

    def _company_for_subscription(self, subscription) -> Company:
        metadata = subscription.get("metadata", {}) or {}
        company_id = metadata.get("company_id")
        if company_id:
            return self._company(UUID(str(company_id)))

        subscription_id = subscription.get("id")
        if subscription_id:
            company = self.companies.get_by_stripe_subscription_id(subscription_id)
            if company is not None:
                return company

        customer_id = subscription.get("customer")
        if customer_id:
            company = self.companies.get_by_stripe_customer_id(customer_id)
            if company is not None:
                return company
        raise NotFoundError("Company for Stripe subscription not found.")

    def _plan_from_subscription(self, subscription) -> PlanType | None:
        metadata_plan = (subscription.get("metadata", {}) or {}).get("plan_type")
        if metadata_plan:
            return PlanType(metadata_plan)

        items = subscription.get("items", {}).get("data", [])
        price_id = items[0].get("price", {}).get("id") if items else None
        settings = get_settings()
        if price_id == settings.stripe_price_pro:
            return PlanType.PRO
        if price_id == settings.stripe_price_business:
            return PlanType.BUSINESS
        return None

    def _company(self, company_id: UUID) -> Company:
        company = self.companies.get(company_id)
        if company is None:
            raise NotFoundError("Company not found.")
        return company

    def _price_id(self, plan_type: PlanType) -> str:
        settings = get_settings()
        price_id = {
            PlanType.PRO: settings.stripe_price_pro,
            PlanType.BUSINESS: settings.stripe_price_business,
        }.get(plan_type)
        if not price_id:
            raise ConflictError(f"Stripe price for {plan_type.value} is not configured.")
        return price_id

    def _stripe(self):
        settings = get_settings()
        if not settings.stripe_secret_key:
            raise ConflictError("Stripe is not configured.")
        try:
            import stripe
        except ModuleNotFoundError as exc:
            raise ConflictError("Stripe integration requires the stripe Python package.") from exc
        stripe.api_key = settings.stripe_secret_key
        stripe.api_version = STRIPE_API_VERSION
        return stripe
