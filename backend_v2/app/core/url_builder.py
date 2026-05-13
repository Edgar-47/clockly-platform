from __future__ import annotations

from urllib.parse import urlparse

from app.core.config import get_settings
from app.core.errors import ConflictError


def build_frontend_url(path: str) -> str:
    """Build app-facing URLs without trusting request-controlled host headers."""
    if not path.startswith("/"):
        path = f"/{path}"
    settings = get_settings()
    return f"{settings.frontend_base_url.rstrip('/')}{path}"


def trusted_frontend_redirect_url(value: str | None, *, fallback: str) -> str:
    """Accept only same-app absolute URLs or root-relative paths for redirects."""
    if not value:
        return fallback

    candidate = value.strip()
    if not candidate:
        return fallback
    if candidate.startswith("/") and not candidate.startswith("//"):
        return build_frontend_url(candidate)

    if is_trusted_frontend_origin(candidate):
        return candidate
    raise ConflictError("Return URL is not allowed.")


def is_trusted_frontend_origin(value: str | None) -> bool:
    origin = _origin(value)
    if origin is None:
        return False
    settings = get_settings()
    trusted = {_origin(settings.frontend_base_url), *(_origin(item) for item in settings.cors_allowed_origins)}
    return origin in {item for item in trusted if item}


def _origin(value: str | None) -> str | None:
    if not value:
        return None
    try:
        parsed = urlparse(value.strip())
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"
