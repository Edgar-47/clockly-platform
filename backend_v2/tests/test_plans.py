from app.models.company import Company
from app.models.enums import PlanType
from app.services.plans import apply_plan_to_company, get_plan_definition


def test_plan_definitions_encode_expected_limits():
    free = get_plan_definition(PlanType.FREE)
    pro = get_plan_definition(PlanType.PRO)
    business = get_plan_definition(PlanType.BUSINESS)

    assert free.max_employees == 5
    assert not free.has_exports
    assert pro.max_employees == 30
    assert pro.has_exports
    assert pro.has_geolocation
    assert business.max_employees is None
    assert business.has_multi_location


def test_apply_plan_to_company_syncs_entitlements():
    company = apply_plan_to_company(Company(name="Demo", slug="demo"), PlanType.PRO)

    assert company.plan_type == PlanType.PRO
    assert company.max_employees == 30
    assert company.has_exports
    assert company.has_advanced_filters
    assert company.has_geolocation
    assert company.has_admin_reports
    assert company.has_support
    assert not company.has_multi_location
