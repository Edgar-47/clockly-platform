from __future__ import annotations

from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.errors import ConflictError


def tenant_zone(timezone_name: str) -> ZoneInfo:
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ConflictError("Company timezone is not configured correctly.") from exc


def ensure_utc(value: datetime, *, default_timezone: str) -> datetime:
    """Normalize an incoming datetime for storage.

    Naive datetimes are interpreted as tenant-local wall time. Aware datetimes
    keep their instant and are converted to UTC.
    """
    if value.tzinfo is None:
        value = value.replace(tzinfo=tenant_zone(default_timezone))
    return value.astimezone(UTC)


def to_tenant_timezone(value: datetime | None, timezone_name: str) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(tenant_zone(timezone_name))


def date_filter_to_utc(
    value: datetime | date | None,
    *,
    default_timezone: str,
    end_of_day: bool = False,
) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return ensure_utc(value, default_timezone=default_timezone)
    local_time = time.max if end_of_day else time.min
    return ensure_utc(datetime.combine(value, local_time), default_timezone=default_timezone)


def duration_seconds(clock_in: datetime, clock_out: datetime) -> int:
    start = clock_in if clock_in.tzinfo is not None else clock_in.replace(tzinfo=UTC)
    end = clock_out if clock_out.tzinfo is not None else clock_out.replace(tzinfo=UTC)
    return max(int((end - start).total_seconds()), 0)
