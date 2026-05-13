from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.errors import ConflictError
from app.core.url_builder import trusted_frontend_redirect_url
from app.models.enums import PlanType
from app.models.stripe_webhook_event import StripeWebhookEvent
from app.services.billing_service import BillingService
from tests.conftest import make_company


def _subscription_event(*, event_id: str, created: int, company_id, status: str = "active"):
    return {
        "id": event_id,
        "type": "customer.subscription.updated",
        "created": created,
        "data": {
            "object": {
                "id": "sub_test",
                "customer": "cus_test",
                "status": status,
                "metadata": {"company_id": str(company_id), "plan_type": "pro"},
                "current_period_end": created + 86_400,
                "cancel_at_period_end": False,
                "items": {"data": []},
            }
        },
    }


def test_checkout_completed_does_not_unlock_paid_plan(db):
    company = make_company(db, plan="free")
    db.commit()

    BillingService(db).handle_event(
        {
            "id": "evt_checkout",
            "type": "checkout.session.completed",
            "created": int(datetime.now(UTC).timestamp()),
            "data": {
                "object": {
                    "id": "cs_test",
                    "client_reference_id": str(company.id),
                    "customer": "cus_test",
                    "subscription": "sub_test",
                    "metadata": {"company_id": str(company.id), "plan_type": "pro"},
                }
            },
        }
    )

    db.refresh(company)
    assert company.plan_type == PlanType.FREE
    assert company.stripe_customer_id == "cus_test"
    assert company.stripe_subscription_id == "sub_test"


def test_stripe_webhook_duplicate_event_is_idempotent(db):
    company = make_company(db, plan="free")
    db.commit()

    service = BillingService(db)
    event = _subscription_event(event_id="evt_subscription", created=1000, company_id=company.id)
    service.handle_event(event)
    duplicate_with_bad_state = _subscription_event(
        event_id="evt_subscription",
        created=1000,
        company_id=company.id,
        status="canceled",
    )
    service.handle_event(duplicate_with_bad_state)

    db.refresh(company)
    records = db.scalars(select(StripeWebhookEvent)).all()
    assert company.plan_type == PlanType.PRO
    assert company.stripe_subscription_status == "active"
    assert len(records) == 1
    assert records[0].status == "processed"


def test_stripe_subscription_out_of_order_event_does_not_reopen_plan(db):
    company = make_company(db, plan="pro")
    db.commit()
    service = BillingService(db)
    now = int(datetime.now(UTC).timestamp())

    service.handle_event(
        {
            "id": "evt_deleted_newer",
            "type": "customer.subscription.deleted",
            "created": now,
            "data": {
                "object": {
                    "id": "sub_test",
                    "customer": "cus_test",
                    "status": "canceled",
                    "metadata": {"company_id": str(company.id), "plan_type": "pro"},
                    "current_period_end": now,
                    "cancel_at_period_end": False,
                    "items": {"data": []},
                }
            },
        }
    )
    service.handle_event(
        _subscription_event(
            event_id="evt_updated_older",
            created=int((datetime.now(UTC) - timedelta(hours=1)).timestamp()),
            company_id=company.id,
        )
    )

    db.refresh(company)
    assert company.plan_type == PlanType.FREE
    assert company.is_active_subscription is False


def test_billing_portal_return_url_rejects_untrusted_origin():
    fallback = "http://localhost:3000/settings?billing=success"

    assert trusted_frontend_redirect_url("/settings/billing", fallback=fallback) == "http://localhost:3000/settings/billing"

    try:
        trusted_frontend_redirect_url("https://evil.example/phish", fallback=fallback)
    except ConflictError:
        pass
    else:
        raise AssertionError("untrusted return_url was accepted")


def test_stripe_subscription_metadata_mismatch_does_not_cross_tenant_update(db):
    company = make_company(db, plan="free")
    other_company = make_company(db, plan="free", name="Other Co", slug="other-co")
    company.stripe_subscription_id = "sub_test"
    company.stripe_customer_id = "cus_test"
    db.add_all([company, other_company])
    db.commit()

    service = BillingService(db)
    event = _subscription_event(event_id="evt_mismatch", created=2000, company_id=other_company.id)

    try:
        service.handle_event(event)
    except ConflictError:
        pass
    else:
        raise AssertionError("mismatched Stripe company metadata was accepted")

    db.refresh(company)
    db.refresh(other_company)
    assert company.plan_type == PlanType.FREE
    assert other_company.plan_type == PlanType.FREE
