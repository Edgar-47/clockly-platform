from app.models.enums import UserRole


ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.SUPERADMIN: {
        "superadmin:access",
        "employees:read",
        "employees:write",
        "schedules:read",
        "schedules:write",
        "attendance:read",
        "attendance:write",
        "attendance:manage",
        "metrics:read",
        "tickets:read",
        "tickets:write",
        "exports:read",
        "locations:read",
        "locations:write",
        "users:manage",
    },
    UserRole.OWNER: {
        "employees:read",
        "employees:write",
        "schedules:read",
        "schedules:write",
        "attendance:read",
        "attendance:write",
        "attendance:manage",
        "metrics:read",
        "tickets:read",
        "tickets:write",
        "exports:read",
        "locations:read",
        "locations:write",
        "users:manage",
    },
    UserRole.ADMIN: {
        "employees:read",
        "employees:write",
        "schedules:read",
        "schedules:write",
        "attendance:read",
        "attendance:write",
        "attendance:manage",
        "metrics:read",
        "tickets:read",
        "tickets:write",
        "exports:read",
        "locations:read",
        "locations:write",
        "users:manage",
    },
    UserRole.MANAGER: {
        "employees:read",
        "schedules:read",
        "attendance:read",
        "attendance:write",
        "attendance:manage",
        "metrics:read",
        "tickets:read",
        "tickets:write",
        "locations:read",
    },
    UserRole.EMPLOYEE: {
        "attendance:read",
        "attendance:write",
        "tickets:read",
        "tickets:write",
    },
}

# Roles that can access business administration features
ADMIN_ROLES = {UserRole.SUPERADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER}


def permissions_for_role(role: UserRole) -> list[str]:
    return sorted(ROLE_PERMISSIONS.get(role, set()))


def role_has_permission(role: UserRole, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def is_admin_role(role: UserRole) -> bool:
    return role in ADMIN_ROLES
