from datetime import UTC, datetime, timedelta

from sqlalchemy import select

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
