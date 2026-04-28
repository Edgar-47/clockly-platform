from enum import StrEnum


class UserRole(StrEnum):
    SUPERADMIN = "superadmin"
    OWNER = "owner"
    ADMIN = "admin"
    HR_MANAGER = "hr_manager"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class InvitationStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"


class PlanType(StrEnum):
    FREE = "free"
    PRO = "pro"
    BUSINESS = "business"


class AttendanceStatus(StrEnum):
    OPEN = "open"
    CLOSED = "closed"
    VOID = "void"


class AttendanceMethod(StrEnum):
    WEB = "web"
    MOBILE = "mobile"
    KIOSK = "kiosk"
    PIN = "pin"


class ClockOutSource(StrEnum):
    EMPLOYEE = "employee"
    ADMIN = "admin"
    MANUAL = "manual"
    AUTO = "auto"


class AttendanceIncidentType(StrEnum):
    AUTO_CLOCK_OUT = "auto_clock_out"


class IncidentStatus(StrEnum):
    OPEN = "open"
    RESOLVED = "resolved"


class SalaryType(StrEnum):
    HOURLY = "hourly"
    DAILY = "daily"
    SHIFT = "shift"
    MONTHLY = "monthly"
    WEEKLY = "weekly"


class TicketStatus(StrEnum):
    OPEN = "open"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class LocationStatus(StrEnum):
    IN_RANGE = "in_range"
    OUT_OF_RANGE = "out_of_range"
    UNKNOWN = "unknown"


class LocationSource(StrEnum):
    BROWSER = "browser"
    MOBILE = "mobile"
    KIOSK = "kiosk"
    MANUAL = "manual"
    UNKNOWN = "unknown"


class LocationPermissionStatus(StrEnum):
    GRANTED = "granted"
    DENIED = "denied"
    UNAVAILABLE = "unavailable"
    UNKNOWN = "unknown"
