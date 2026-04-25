from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.auth_cookies import REFRESH_COOKIE_NAME, clear_auth_cookies, set_auth_cookies
from app.core.errors import AuthenticationError
from app.core.rate_limit import client_ip, login_limiter, refresh_limiter
from app.db.session import get_db
from app.dependencies.auth import TenantContext, get_current_context
from app.schemas.auth import CompanyContext, LoginRequest, LogoutResponse, MeResponse, RefreshRequest, TokenResponse
from app.services.auth_service import AuthService, AuthTokens
from app.services.plans import get_plan_definition
from app.services.permissions import permissions_for_role


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
        has_admin_reports=company.has_admin_reports,
        has_support=company.has_support,
        trial_ends_at=company.trial_ends_at,
        is_active_subscription=company.is_active_subscription,
        created_by=company.created_by,
    )
