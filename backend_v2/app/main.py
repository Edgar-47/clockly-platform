import time
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
import structlog

from app.api.router import api_router
from app.core.auth_cookies import ACCESS_COOKIE_NAME
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import bind_request_context, clear_request_context, configure_logging
from app.core.security import TokenDecodeError, decode_access_token
from app.core.sentry import configure_sentry, set_sentry_request_context


settings = get_settings()
configure_logging(settings)
configure_sentry(settings)
logger = structlog.get_logger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="ClockLy REST API for web, kiosk and mobile clients.",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

if settings.trusted_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

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
            if k == "url":
                continue  # strip Pydantic docs URL from responses
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
def health() -> dict[str, str]:
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


def _as_str(value: object) -> str | None:
    return str(value) if value else None
