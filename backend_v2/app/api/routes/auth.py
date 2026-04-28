import logging

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.auth_cookies import REFRESH_COOKIE_NAME, clear_auth_cookies, set_auth_cookies
from app.core.errors import AuthenticationError
from app.core.rate_limit import client_ip, login_limiter, password_reset_limiter, refresh_limiter, registration_limiter
from app.db.session import get_db
from app.dependencies.auth import TenantContext, get_current_context
from app.dependencies.email import get_email_service
from app.schemas.auth import (
    CompanyContext,
    LoginRequest,
    LogoutResponse,
    MeResponse,
    MessageResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RegisterCompanyRequest,
    TokenResponse,
)
from app.services.email_service import EmailService
from app.services.auth_service import AuthService, AuthTokens
from app.services.plans import get_plan_definition
from app.services.permissions import permissions_for_role


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    login_limiter.check(client_ip(request))
    tokens = AuthService(db).login(
        identifier=payload.login_identifier,
        password=payload.password,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    set_auth_cookies(response, access_token=tokens.access_token, refresh_token=tokens.refresh_token)
    return _token_response(tokens)


@router.post("/register-company", response_model=TokenResponse)
def register_company(
    payload: RegisterCompanyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    registration_limiter.check(client_ip(request))
    tokens = AuthService(db).register_company(
        payload,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    set_auth_cookies(response, access_token=tokens.access_token, refresh_token=tokens.refresh_token)
    return _token_response(tokens)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: Request,
    response: Response,
    payload: RefreshRequest | None = None,
    db: Session = Depends(get_db),
) -> TokenResponse:
    refresh_limiter.check(client_ip(request))
    refresh_token_value = (
        payload.refresh_token
        if payload and payload.refresh_token
        else request.cookies.get(REFRESH_COOKIE_NAME)
    )
    if not refresh_token_value:
        raise AuthenticationError("Missing refresh token.")
    tokens = AuthService(db).refresh(
        refresh_token_value=refresh_token_value,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    set_auth_cookies(response, access_token=tokens.access_token, refresh_token=tokens.refresh_token)
    return _token_response(tokens)


@router.get("/me", response_model=MeResponse)
def me(ctx: TenantContext = Depends(get_current_context)) -> MeResponse:
    return MeResponse(
        user=ctx.user,
        company=_company_context(ctx.company),
        permissions=ctx.permissions,
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> LogoutResponse:
    AuthService(db).logout(refresh_token_value=request.cookies.get(REFRESH_COOKIE_NAME))
    clear_auth_cookies(response)
    return LogoutResponse()


@router.post("/request-password-reset", response_model=MessageResponse)
def request_password_reset(
    payload: PasswordResetRequest,
    request: Request,
    email_service: EmailService = Depends(get_email_service),
    db: Session = Depends(get_db),
) -> MessageResponse:
    password_reset_limiter.check(client_ip(request))
    reset_email = AuthService(db).request_password_reset(
        email=payload.email,
        reset_url=_reset_url_template(request),
        ip_address=request.client.host if request.client else None,
    )
    if reset_email is not None:
        try:
            email_service.send_password_reset_email(reset_email)
        except Exception:
            logger.exception(
                "Password reset email delivery failed.",
                extra={"to_email": reset_email.to_email},
            )
    return MessageResponse(message="If the email exists, password reset instructions have been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: PasswordResetConfirm,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageResponse:
    password_reset_limiter.check(client_ip(request))
    AuthService(db).reset_password(token=payload.token, password=payload.password)
    return MessageResponse(message="Password has been reset.")


def _token_response(tokens: AuthTokens) -> TokenResponse:
    company = tokens.user.company
    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_in=tokens.expires_in,
        user=tokens.user,
        company=_company_context(company),
        permissions=permissions_for_role(tokens.user.role),
    )


def _company_context(company) -> CompanyContext:
    plan = get_plan_definition(company.plan_type)
    return CompanyContext(
        id=company.id,
        name=company.name,
        slug=company.slug,
        timezone=company.timezone,
        plan_type=company.plan_type,
        plan_name=plan.name,
        max_employees=company.max_employees,
        has_exports=company.has_exports,
        has_advanced_filters=company.has_advanced_filters,
        has_multi_location=company.has_multi_location,
        has_geolocation=company.has_geolocation,
        has_admin_reports=company.has_admin_reports,
        has_support=company.has_support,
        trial_ends_at=company.trial_ends_at,
        is_active_subscription=company.is_active_subscription,
        is_beta_user=company.is_beta_user,
        stripe_subscription_status=company.stripe_subscription_status,
        created_by=company.created_by,
    )


def _reset_url_template(request: Request) -> str:
    base = (request.headers.get("origin") or str(request.base_url)).rstrip("/")
    return f"{base}/reset-password/{{token}}"
