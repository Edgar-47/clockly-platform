"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Banknote,
  BookOpenCheck,
  Building2,
  CalendarDays,
  Clock,
  Landmark,
  LayoutDashboard,
  LogOut,
  MapPin,
  MonitorSmartphone,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  StickyNote,
  TicketCheck,
  TimerOff,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useLogout, useMe } from "@/hooks/use-auth";
import { useSidebarStore } from "@/store/sidebar.store";
import { getInitials } from "@/lib/utils";
import type { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  roles?: UserRole[];
};

const NAV_MAIN: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Empleados", href: "/employees", icon: Users, permission: "employees:read" },
  { label: "Fichajes", href: "/sessions", icon: Clock, permission: "attendance:read" },
];

const NAV_OPERATIONS: NavItem[] = [
  { label: "Analíticas", href: "/analytics", icon: BarChart3, permission: "metrics:read" },
  { label: "Tablero", href: "/board", icon: StickyNote, permission: "board:read" },
  { label: "Incidencias", href: "/tickets", icon: TicketCheck, permission: "tickets:read" },
  { label: "Retrasos", href: "/late-arrivals", icon: TimerOff, permission: "late_arrivals:read" },
  { label: "Gastos", href: "/expenses", icon: Receipt, permission: "expense_tickets:read" },
  { label: "Caja", href: "/cash-closures", icon: Landmark, permission: "cash_closures:read" },
  { label: "Localizaciones", href: "/locations", icon: MapPin, permission: "locations:read" },
  { label: "Salarios", href: "/salaries", icon: Banknote, permission: "salary:read" },
  { label: "Libro Registro", href: "/sessions/itss", icon: Shield, permission: "exports:read" },
  { label: "Exportar nómina", href: "/sessions/payroll", icon: Wallet, permission: "exports:read" },
];

const NAV_CONFIG: NavItem[] = [
  { label: "Horarios", href: "/schedules", icon: CalendarDays, permission: "schedules:read" },
  { label: "Centros de trabajo", href: "/work-locations", icon: Building2, permission: "locations:write" },
  { label: "Tutoriales", href: "/tutorials", icon: BookOpenCheck, roles: ["owner", "admin", "hr_manager", "manager"] },
  { label: "Upgrade", href: "/upgrade", icon: Sparkles, permission: "users:manage" },
  { label: "Configuración", href: "/settings", icon: Settings, permission: "settings:read" },
];

function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-xmuted">
        {label}
      </p>
      <ul className="space-y-0.5">
        {items.map(({ label: itemLabel, href, icon: Icon }) => {
          const active = href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium transition-all duration-150 lg:py-2",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-ink-muted hover:bg-surface-bg hover:text-ink",
                )}
              >
                <Icon
                  className={cn(
                    "h-[15px] w-[15px] flex-shrink-0 transition-transform duration-150",
                    active ? "scale-105" : "group-hover:scale-105",
                  )}
                />
                {itemLabel}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const logout = useLogout();
  const { data: me } = useMe();
  const role = me?.user.role;
  const user = me?.user;
  const permissions = me?.permissions ?? [];
  const [firstName = "", ...restName] = user?.full_name.split(" ") ?? [];
  const lastName = restName.join(" ");

  const { isOpen, close } = useSidebarStore();

  const roleLabel: Record<string, string> = {
    superadmin: "Superadmin",
    owner: "Propietario",
    admin: "Administrador",
    hr_manager: "Resp. RRHH",
    manager: "Manager",
    employee: "Empleado",
  };
  const canSee = (item: NavItem) =>
    (!item.permission || permissions.includes(item.permission)) &&
    (!item.roles || item.roles.includes((role ?? "employee") as UserRole));
  const canOpenKiosk = role === "owner" || role === "admin" || role === "manager";

  const sidebarContent = (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-border bg-surface-sidebar transition-transform duration-300 ease-in-out",
        // Always visible on desktop
        "lg:translate-x-0",
        // Slide in/out on mobile based on store state
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-[62px] items-center justify-between border-b border-border px-5">
        <Logo size="sm" />
        {/* Close button — only visible on mobile */}
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={close}
          className="rounded-md p-1.5 text-ink-muted hover:bg-surface-bg hover:text-ink transition-colors lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <NavGroup label="Principal" items={NAV_MAIN.filter(canSee)} pathname={pathname} onNavigate={close} />
        <NavGroup label="Operativa" items={NAV_OPERATIONS.filter(canSee)} pathname={pathname} onNavigate={close} />
        <NavGroup label="Sistema" items={NAV_CONFIG.filter(canSee)} pathname={pathname} onNavigate={close} />
      </nav>

      <div className="space-y-0.5 border-t border-border p-3">
        {user && (
          <div className="mb-2 flex items-center gap-2.5 rounded-md px-2.5 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {getInitials(firstName, lastName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-none text-ink">
                {user.full_name}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-xmuted">
                {roleLabel[role ?? ""] ?? role}
              </p>
            </div>
          </div>
        )}

        {canOpenKiosk && (
          <Link
            href="/kiosk"
            target="_blank"
            onClick={close}
            className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-bg hover:text-ink lg:py-2"
          >
            <MonitorSmartphone className="h-[15px] w-[15px]" />
            Abrir Kiosk
          </Link>
        )}
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium text-ink-muted transition-all duration-150 hover:bg-danger-bg hover:text-danger-DEFAULT lg:py-2"
        >
          <LogOut className="h-[15px] w-[15px]" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {sidebarContent}
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
    </>
  );
}
