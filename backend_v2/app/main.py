import os
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.datastructures import Headers, URL
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import PlainTextResponse, RedirectResponse
from starlette.types import Receive, Scope, Send
import structlog

from app.api.router import api_router
from app.core.auth_cookies import ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import bind_request_context, clear_request_context, configure_logging
from app.core.security import TokenDecodeError, decode_access_token
from app.core.sentry import configure_sentry, set_sentry_request_context
from app.core.url_builder import is_trusted_frontend_origin


settings = get_settings()
configure_logging(settings)
configure_sentry(settings)
logger = structlog.get_logger(__name__)


class LoggingTrustedHostMiddleware(TrustedHostMiddleware):
    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if self.allow_any or scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        raw_host = headers.get("host", "")
        host = raw_host.split(":")[0]
        is_valid_host = False
        found_www_redirect = False
        for pattern in self.allowed_hosts:
            if host == pattern or (pattern.startswith("*") and host.endswith(pattern[1:])):
                is_valid_host = True
                break
            if "www." + host == pattern:
                found_www_redirect = True

        if is_valid_host:
            await self.app(scope, receive, send)
            return

        logger.warning(
            "request.rejected_by_trusted_host",
            method=scope.get("method"),
            path=scope.get("path"),
            host=raw_host,
            normalized_host=host,
            x_forwarded_host=headers.get("x-forwarded-host"),
            x_forwarded_proto=headers.get("x-forwarded-proto"),
            fly_region=headers.get("fly-region"),
            fly_forwarded_port=headers.get("fly-forwarded-port"),
            user_agent=headers.get("user-agent"),
            allowed_hosts=self.allowed_hosts,
        )
        if found_www_redirect and self.www_redirect:
            url = URL(scope=scope)
            response = RedirectResponse(url=str(url.replace(netloc="www." + url.netloc)))
        else:
            response = PlainTextResponse("Invalid host header", status_code=400)
        await response(scope, receive, send)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="ClockLy REST API for web, kiosk and mobile clients.",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

logger.info(
    "app.settings.loaded",
    environment=settings.environment,
    docs_enabled=app.docs_url is not None,
    trusted_hosts=settings.trusted_hosts,
    trusted_hosts_env_present=os.getenv("CLOCKLY_TRUSTED_HOSTS") is not None,
    cors_allowed_origins=settings.cors_allowed_origins,
    trust_proxy_headers=settings.trust_proxy_headers,
)

if settings.trusted_hosts:
    app.add_middleware(LoggingTrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

if settings.cors_allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
        expose_headers=["Content-Disposition", "X-Request-ID", "Retry-After", "X-RateLimit-Limit"],
    )


@app.middleware("http")
async def enforce_cookie_csrf_origin(request: Request, call_next):
    if _requires_csrf_origin_check(request) and not _has_trusted_origin(request):
        return JSONResponse(
            status_code=403,
            content={
                "error": {
                    "code": "forbidden",
                    "message": "Cross-site request origin is not allowed.",
                }
            },
        )
    return await call_next(request)


@app.middleware("http")
async def add_request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    user_id, company_id = _identity_from_request(request)
    bind_request_context(request_id=request_id, user_id=user_id, company_id=company_id)
    set_sentry_request_context(request_id=request_id, user_id=user_id, company_id=company_id)
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        logger.exception(
            "request.failed",
            method=request.method,
            path=request.url.path,
            duration_ms=duration_ms,
        )
        clear_request_context()
        raise

    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request.completed",
        method=request.method,
        path=request.url.path,
        host=request.headers.get("host"),
        x_forwarded_host=request.headers.get("x-forwarded-host"),
        x_forwarded_proto=request.headers.get("x-forwarded-proto"),
        fly_region=request.headers.get("fly-region"),
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    clear_request_context()
    return response


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    if settings.environment == "production":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)")
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    payload = {
        "error": {
            "code": exc.detail.code,
            "message": exc.detail.message,
        }
    }
    if exc.detail.details:
        payload["error"]["details"] = exc.detail.details
    if exc.status_code == 401:
        headers = {"WWW-Authenticate": "Bearer"}
    elif exc.status_code == 429:
        details = exc.detail.details or {}
        retry_after = str(details.get("retry_after_seconds", 60))
        headers = {
            "Retry-After": retry_after,
            "X-RateLimit-Reset": retry_after,
        }
        if details.get("limit") is not None:
            headers["X-RateLimit-Limit"] = str(details["limit"])
        if details.get("window_seconds") is not None:
            headers["X-RateLimit-Window"] = str(details["window_seconds"])
    else:
        headers = None
    return JSONResponse(status_code=exc.status_code, content=payload, headers=headers)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    safe_errors = []
    for e in exc.errors():
        err: dict = {}
        for k, v in e.items():
            if k in {"url", "input"}:
                continue  # strip Pydantic docs URL and user-supplied sensitive input
            if k == "ctx":
                err[k] = {ck: str(cv) for ck, cv in v.items()}
            else:
                err[k] = v
        safe_errors.append(err)
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "Request validation failed.",
                "details": {"errors": safe_errors},
            }
        },
    )


@app.get("/health", tags=["system"])
def health(request: Request) -> dict[str, str]:
    logger.info(
        "health.checked",
        host=request.headers.get("host"),
        x_forwarded_host=request.headers.get("x-forwarded-host"),
        x_forwarded_proto=request.headers.get("x-forwarded-proto"),
        fly_region=request.headers.get("fly-region"),
        user_agent=request.headers.get("user-agent"),
    )
    return {"status": "ok"}


app.include_router(api_router)


def _identity_from_request(request: Request) -> tuple[str | None, str | None]:
    token = _access_token_from_request(request)
    if token is None:
        return None, None
    try:
        payload = decode_access_token(token)
    except TokenDecodeError:
        return None, None
    return _as_str(payload.get("sub")), _as_str(payload.get("company_id"))


def _access_token_from_request(request: Request) -> str | None:
    authorization = request.headers.get("authorization")
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    return request.cookies.get(ACCESS_COOKIE_NAME)


def _requires_csrf_origin_check(request: Request) -> bool:
    if settings.environment.lower() != "production":
        return False
    if request.method.upper() not in {"POST", "PUT", "PATCH", "DELETE"}:
        return False
    if request.url.path == "/billing/webhook":
        return False
    if request.headers.get("authorization"):
        return False
    return bool(request.cookies.get(ACCESS_COOKIE_NAME) or request.cookies.get(REFRESH_COOKIE_NAME))


def _has_trusted_origin(request: Request) -> bool:
    origin = request.headers.get("origin")
    if origin:
        return is_trusted_frontend_origin(origin)
    referer = request.headers.get("referer")
    if referer:
        return is_trusted_frontend_origin(referer)
    return False


def _as_str(value: object) -> str | None:
    return str(value) if value else None
