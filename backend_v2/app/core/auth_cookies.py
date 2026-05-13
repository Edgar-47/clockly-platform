from fastapi import Response

from app.core.config import get_settings


ACCESS_COOKIE_NAME = "clockly_access"
REFRESH_COOKIE_NAME = "clockly_refresh"


def _cookie_kwargs(*, max_age: int) -> dict[str, object]:
    settings = get_settings()
    return {
        "httponly": True,
        "secure": settings.environment.lower() == "production",
        "samesite": "lax",
        "path": "/",
        "max_age": max_age,
    }


def set_auth_cookies(response: Response, *, access_token: str, refresh_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        **_cookie_kwargs(max_age=settings.access_token_expire_minutes * 60),
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        **_cookie_kwargs(max_age=settings.refresh_token_expire_days * 24 * 60 * 60),
    )


def clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    secure = settings.environment.lower() == "production"
    response.delete_cookie(
        ACCESS_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=secure,
    )
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=secure,
    )
