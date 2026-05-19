from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, PermissionDenied
from app.models.company import Company
from app.models.company_usage_log import CompanyUsageLog
from app.models.enums import PlanType
from app.repositories.company_repository import CompanyRepository
from app.repositories.employee_repository import EmployeeRepository


PlanFeatureName = Literal[
    "has_exports",
    "has_advanced_filters",
    "has_multi_location",
    "has_geolocation",
    "has_admin_reports",
    "has_support",
]

PLAN_FEATURES: tuple[PlanFeatureName, ...] = (
    "has_exports",
    "has_advanced_filters",
    "has_multi_location",
    "has_geolocation",
    "has_admin_reports",
    "has_support",
)


@dataclass(frozen=True)
class PlanDefinition:
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
    recommended: bool = False
    custom_onboarding: bool = False

    @property
    def features(self) -> dict[str, bool]:
        return {feature: bool(getattr(self, feature)) for feature in PLAN_FEATURES}


PLAN_DEFINITIONS: dict[PlanType, PlanDefinition] = {
    PlanType.FREE: PlanDefinition(
        code=PlanType.FREE,
        name="Free",
        description="Para validar el control horario con un equipo pequeno.",
        max_employees=5,
        has_exports=False,
        has_advanced_filters=False,
        has_multi_location=False,
        has_geolocation=False,
        has_admin_reports=False,
        has_support=False,
        cta_label="Solicitar acceso",
    ),
    PlanType.PRO: PlanDefinition(
        code=PlanType.PRO,
        name="Pro",
        description="Para negocios que necesitan informes, filtros y exportaciones.",
        max_employees=30,
        has_exports=True,
        has_advanced_filters=True,
        has_multi_location=True,
        has_geolocation=True,
        has_admin_reports=True,
        has_support=True,
        cta_label="Quiero Pro",
        recommended=True,
    ),
    PlanType.BUSINESS: PlanDefinition(
        code=PlanType.BUSINESS,
        name="Business",
        description="Para operaciones con varias sedes, soporte y crecimiento sin limite.",
        max_employees=None,
        has_exports=True,
        has_advanced_filters=True,
        has_multi_location=True,
        has_geolocation=True,
        has_admin_reports=True,
        has_support=True,
        cta_label="Planificar demo",
        custom_onboarding=True,
    ),
}

FEATURE_REQUIRED_PLAN: dict[PlanFeatureName, PlanType] = {
    "has_exports": PlanType.PRO,
    "has_advanced_filters": PlanType.PRO,
    "has_multi_location": PlanType.BUSINESS,
    "has_geolocation": PlanType.PRO,
    "has_admin_reports": PlanType.PRO,
    "has_support": PlanType.PRO,
}

FEATURE_LABELS: dict[PlanFeatureName, str] = {
    "has_exports": "exportaciones PDF y Excel",
    "has_advanced_filters": "filtros avanzados",
    "has_multi_location": "multi negocio y sedes",
    "has_geolocation": "geolocalizacion en fichajes",
    "has_admin_reports": "informes de administracion",
    "has_support": "soporte prioritario",
}


class PlanRequiredError(PermissionDenied):
    code = "plan_required"


class PlanLimitError(PermissionDenied):
    code = "plan_limit_reached"


def list_plan_definitions() -> list[PlanDefinition]:
    return [PLAN_DEFINITIONS[PlanType.FREE], PLAN_DEFINITIONS[PlanType.PRO], PLAN_DEFINITIONS[PlanType.BUSINESS]]


def get_plan_definition(plan_type: PlanType | str) -> PlanDefinition:
    return PLAN_DEFINITIONS[PlanType(plan_type)]


def plan_definition_payload(plan: PlanDefinition) -> dict:
    payload = asdict(plan)
    payload["code"] = plan.code.value
    payload["features"] = plan.features
    payload["feature_labels"] = feature_labels_for_plan(plan)
    return payload


def feature_labels_for_plan(plan: PlanDefinition) -> list[str]:
    labels: list[str] = [employee_limit_label(plan)]
    if plan.has_exports:
        labels.append("Exportaciones PDF y Excel")
    else:
        labels.append("Registro manual basico")
    if plan.has_advanced_filters:
        labels.append("Filtros avanzados")
    if plan.has_admin_reports:
        labels.append("Informes de administracion")
    if plan.has_multi_location:
        labels.append("Multi negocio y sedes")
    if plan.has_geolocation:
        labels.append("Geolocalizacion de fichajes")
    if plan.has_support:
        labels.append("Soporte prioritario")
    if plan.custom_onboarding:
        labels.append("Onboarding personalizado")
    return labels


def employee_limit_label(plan: PlanDefinition) -> str:
    if plan.max_employees is None:
        return "Empleados ilimitados"
    return f"Hasta {plan.max_employees} empleados"


def apply_plan_to_company(company: Company, plan_type: PlanType | str) -> Company:
    plan = get_plan_definition(plan_type)
    company.plan_type = plan.code
    company.max_employees = plan.max_employees
    company.has_exports = plan.has_exports
    company.has_advanced_filters = plan.has_advanced_filters
    company.has_multi_location = plan.has_multi_location
    company.has_geolocation = plan.has_geolocation
    company.has_admin_reports = plan.has_admin_reports
    company.has_support = plan.has_support
    return company


def company_feature_enabled(company: Company, feature_name: PlanFeatureName) -> bool:
    if feature_name not in PLAN_FEATURES:
        raise ValueError(f"Unknown plan feature: {feature_name}")
    return bool(getattr(company, feature_name))


def required_plan_for_feature(feature_name: PlanFeatureName) -> PlanDefinition:
    return get_plan_definition(FEATURE_REQUIRED_PLAN[feature_name])


def check_company_plan_feature(company: Company, feature_name: PlanFeatureName) -> None:
    if company_feature_enabled(company, feature_name):
        return
    required_plan = required_plan_for_feature(feature_name)
    raise PlanRequiredError(
        f"Esta funcionalidad requiere plan {required_plan.name}.",
        details={
            "feature": feature_name,
            "feature_label": FEATURE_LABELS[feature_name],
            "required_plan": required_plan.code.value,
            "current_plan": company.plan_type.value,
        },
    )


def check_plan_feature(
    db: Session,
    company_id: UUID,
    feature_name: PlanFeatureName,
    *,
    actor_user_id: UUID | None = None,
) -> Company:
    company = CompanyRepository(db).get(company_id)
    if company is None:
        raise NotFoundError("Company not found.")
    try:
        check_company_plan_feature(company, feature_name)
    except PlanRequiredError:
        record_company_usage(
            db,
            company_id=company_id,
            feature_name=feature_name,
            action="blocked",
            actor_user_id=actor_user_id,
        )
        raise
    record_company_usage(
        db,
        company_id=company_id,
        feature_name=feature_name,
        action="allowed",
        actor_user_id=actor_user_id,
    )
    return company


def check_employee_limit(db: Session, company_id: UUID, *, actor_user_id: UUID | None = None) -> None:
    company = CompanyRepository(db).get(company_id)
    if company is None:
        raise NotFoundError("Company not found.")
    if company.max_employees is None:
        return
    active_count = EmployeeRepository(db, company_id=company_id).count(include_inactive=False)
    if active_count < company.max_employees:
        return
    recommended_plan = get_plan_definition(PlanType.PRO if company.plan_type == PlanType.FREE else PlanType.BUSINESS)
    record_company_usage(
        db,
        company_id=company_id,
        feature_name="max_employees",
        action="blocked",
        actor_user_id=actor_user_id,
        metadata={
            "active_count": active_count,
            "max_employees": company.max_employees,
            "current_plan": company.plan_type.value,
        },
    )
    raise PlanLimitError(
        f"Has alcanzado el limite de {company.max_employees} empleados del plan {get_plan_definition(company.plan_type).name}.",
        details={
            "limit": "max_employees",
            "active_count": active_count,
            "max_employees": company.max_employees,
            "required_plan": recommended_plan.code.value,
            "current_plan": company.plan_type.value,
        },
    )


def record_company_usage(
    db: Session,
    *,
    company_id: UUID,
    feature_name: str,
    action: str,
    actor_user_id: UUID | None = None,
    metadata: dict | None = None,
) -> None:
    db.add(
        CompanyUsageLog(
            company_id=company_id,
            actor_user_id=actor_user_id,
            feature_name=feature_name,
            action=action,
            metadata_json=metadata,
        )
    )
