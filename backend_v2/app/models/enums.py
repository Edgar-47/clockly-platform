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
