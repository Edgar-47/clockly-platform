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


class ExpenseCategory(StrEnum):
    FOOD = "food"
    CLEANING = "cleaning"
    SUPPLIES = "supplies"
    REPAIR = "repair"
    TRANSPORT = "transport"
    OTHER = "other"


class PaymentSource(StrEnum):
    PERSONAL_MONEY = "personal_money"
    COMPANY_ACCOUNT = "company_account"
    COMPANY_CARD = "company_card"
    TIPS_POOL = "tips_pool"
    CASH_REGISTER = "cash_register"
    OTHER = "other"


class ExpenseStatus(StrEnum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"


class ExpenseEventType(StrEnum):
    CREATED = "created"
    UPDATED = "updated"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"
    ATTACHMENT_UPLOADED = "attachment_uploaded"
    NOTE_ADDED = "note_added"


class LateArrivalStatus(StrEnum):
    PENDING = "pending"
    JUSTIFIED = "justified"
    UNJUSTIFIED = "unjustified"
    IGNORED = "ignored"


class ScheduleType(StrEnum):
    NONE = "none"
    FIXED = "fixed"
    WEEKLY_CUSTOM = "weekly_custom"
    FLEXIBLE_WINDOW = "flexible_window"


class CashClosureShift(StrEnum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    NIGHT = "night"
    CUSTOM = "custom"
