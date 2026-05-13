import logging
import hashlib

from fastapi import APIRouter, Depends, Request, status as http_status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.dependencies.email import get_email_service
from app.core.url_builder import build_frontend_url
from app.schemas.employee import EmployeeRead
from app.schemas.invitation import InvitationCreate, InvitationCreateResponse, InvitationRead
from app.schemas.onboarding import (
    OnboardingCompanyUpdate,
    OnboardingCompleteResponse,
    OnboardingFirstEmployeeCreate,
    OnboardingFirstEmployeeResponse,
    OnboardingInvitationResponse,
    OnboardingInvitationsSkipResponse,
    OnboardingInviteCreate,
    OnboardingKioskPinUpdate,
    OnboardingStatusResponse,
)
from app.services.email_service import EmailService, InvitationEmail
from app.services.invitation_service import InvitationService
from app.services.onboarding_service import OnboardingService


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/status", response_model=OnboardingStatusResponse)
def get_status(
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> OnboardingStatusResponse:
    return OnboardingService(db, company_id=ctx.company_id).status()


@router.put("/company", response_model=OnboardingStatusResponse)
def update_company(
    payload: OnboardingCompanyUpdate,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> OnboardingStatusResponse:
    return OnboardingService(db, company_id=ctx.company_id).update_company(payload, actor=ctx.user)


@router.post("/first-employee", response_model=OnboardingFirstEmployeeResponse, status_code=http_status.HTTP_201_CREATED)
def create_first_employee(
    payload: OnboardingFirstEmployeeCreate,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> OnboardingFirstEmployeeResponse:
    employee, onboarding_status = OnboardingService(db, company_id=ctx.company_id).create_first_employee(
        payload,
        actor=ctx.user,
    )
    return OnboardingFirstEmployeeResponse(
        employee=EmployeeRead.model_validate(employee),
        status=onboarding_status,
    )


@router.post("/kiosk-pin", response_model=OnboardingStatusResponse)
def configure_kiosk_pin(
    payload: OnboardingKioskPinUpdate,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> OnboardingStatusResponse:
    return OnboardingService(db, company_id=ctx.company_id).configure_kiosk_pin(
        employee_id=payload.employee_id,
        pin=payload.pin,
        actor=ctx.user,
    )


@router.post("/invitations", response_model=OnboardingInvitationResponse, status_code=http_status.HTTP_201_CREATED)
def create_invitation(
    payload: OnboardingInviteCreate,
    request: Request,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    email_service: EmailService = Depends(get_email_service),
    db: Session = Depends(get_db),
) -> OnboardingInvitationResponse:
    _limit_invitation_create(request, ctx.user.email)
    invitation_payload = InvitationCreate(email=payload.email, role=payload.role)
    result = InvitationService(db, company_id=ctx.company_id).create_invitation(invitation_payload, actor=ctx.user)
    invitation = InvitationRead.model_validate(result.invitation)
    acceptance_url = _acceptance_url(request, result.acceptance_token)
    try:
        email_service.send_invitation_email(
            InvitationEmail(
                to_email=invitation.email,
                company_name=ctx.company.name,
                invited_by_name=ctx.user.full_name,
                role=invitation.role,
                acceptance_url=acceptance_url,
                expires_at=invitation.expires_at,
            )
        )
    except Exception:
        logger.exception(
            "Invitation email delivery failed.",
            extra={"company_id": str(ctx.company_id), "invitation_id": str(invitation.id)},
        )
    onboarding_status = OnboardingService(db, company_id=ctx.company_id).mark_invitations_done(actor=ctx.user)
    return OnboardingInvitationResponse(
        invitation=InvitationCreateResponse(
            **invitation.model_dump(),
            acceptance_url=acceptance_url,
        ),
        status=onboarding_status,
    )


@router.post("/invitations/skip", response_model=OnboardingInvitationsSkipResponse)
def skip_invitations(
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> OnboardingInvitationsSkipResponse:
    onboarding_status = OnboardingService(db, company_id=ctx.company_id).mark_invitations_done(actor=ctx.user)
    return OnboardingInvitationsSkipResponse(status=onboarding_status)


@router.post("/complete", response_model=OnboardingCompleteResponse)
def complete(
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> OnboardingCompleteResponse:
    onboarding_status = OnboardingService(db, company_id=ctx.company_id).complete(actor=ctx.user)
    return OnboardingCompleteResponse(status=onboarding_status)


def _acceptance_url(request: Request, token: str) -> str:
    return build_frontend_url(f"/accept-invitation/{token}")


def _limit_invitation_create(request: Request, actor_email: str) -> None:
    invitation_limiter.check(f"ip:{client_ip(request)}")
    digest = hashlib.sha256(actor_email.lower().encode("utf-8")).hexdigest()
    invitation_limiter.check(f"actor:{digest}")
from app.core.rate_limit import client_ip, invitation_limiter
