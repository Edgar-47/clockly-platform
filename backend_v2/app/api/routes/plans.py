from fastapi import APIRouter, Depends

from app.dependencies.auth import TenantContext, get_current_context
from app.schemas.plans import CompanyPlanContext, PlanListResponse
from app.services.plans import get_plan_definition, list_plan_definitions, plan_definition_payload


router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=PlanListResponse)
def list_plans() -> PlanListResponse:
    return PlanListResponse(
        items=[plan_definition_payload(plan) for plan in list_plan_definitions()]
    )


@router.get("/current", response_model=CompanyPlanContext)
def current_plan(ctx: TenantContext = Depends(get_current_context)) -> CompanyPlanContext:
    plan = get_plan_definition(ctx.company.plan_type)
    return CompanyPlanContext(
        plan_type=ctx.company.plan_type,
        plan_name=plan.name,
        max_employees=ctx.company.max_employees,
        has_exports=ctx.company.has_exports,
        has_advanced_filters=ctx.company.has_advanced_filters,
        has_multi_location=ctx.company.has_multi_location,
        has_geolocation=ctx.company.has_geolocation,
        has_admin_reports=ctx.company.has_admin_reports,
        has_support=ctx.company.has_support,
        trial_ends_at=ctx.company.trial_ends_at,
        is_active_subscription=ctx.company.is_active_subscription,
        is_beta_user=ctx.company.is_beta_user,
        stripe_subscription_status=ctx.company.stripe_subscription_status,
        stripe_current_period_end=ctx.company.stripe_current_period_end,
        stripe_cancel_at_period_end=ctx.company.stripe_cancel_at_period_end,
        created_by=ctx.company.created_by,
    )
