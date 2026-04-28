from fastapi import APIRouter

from app.api.routes import (
    attendance,
    attendance_locations,
    auth,
    billing,
    businesses,
    employees,
    exports,
    invitations,
    locations,
    metrics,
    onboarding,
    plans,
    schedules,
    settings,
    salary,
    superadmin,
    tickets,
    users,
)


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(billing.router)
api_router.include_router(users.router)
api_router.include_router(businesses.router)
api_router.include_router(invitations.router)
api_router.include_router(employees.router)
api_router.include_router(schedules.router)
api_router.include_router(settings.router)
api_router.include_router(salary.router)
api_router.include_router(attendance.router)
api_router.include_router(metrics.router)
api_router.include_router(tickets.router)
api_router.include_router(exports.router)
api_router.include_router(locations.router)
api_router.include_router(attendance_locations.router)
api_router.include_router(plans.router)
api_router.include_router(onboarding.router)
api_router.include_router(superadmin.router)
