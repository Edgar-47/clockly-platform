from enum import StrEnum


class UserRole(StrEnum):
    SUPERADMIN = "superadmin"
    OWNER = "owner"
    ADMIN = "admin"
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
