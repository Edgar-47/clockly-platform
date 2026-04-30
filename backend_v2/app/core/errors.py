from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class ErrorDetail:
    code: str
    message: str
    details: dict[str, Any] | None = None


class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.detail = ErrorDetail(code=self.code, message=message, details=details)


class AuthenticationError(AppError):
    status_code = 401
    code = "unauthorized"


class PermissionDenied(AppError):
    status_code = 403
    code = "forbidden"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class RateLimitError(AppError):
    status_code = 429
    code = "rate_limit_exceeded"

    def __init__(
        self,
        message: str,
        *,
        retry_after_seconds: int,
        limit: int | None = None,
        window_seconds: int | None = None,
    ) -> None:
        details: dict[str, Any] = {"retry_after_seconds": retry_after_seconds}
        if limit is not None:
            details["limit"] = limit
        if window_seconds is not None:
            details["window_seconds"] = window_seconds
        super().__init__(message, details=details)
