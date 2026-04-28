"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Banknote,
  Building2,
  Clock,
  LayoutDashboard,
  LogOut,
  MapPin,
  MonitorSmartphone,
  Settings,
  Sparkles,
  TicketCheck,
  Users,
} from "lucide-react";
import { useLogout, useMe } from "@/hooks/use-auth";
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
  { label: "Analiticas", href: "/analytics", icon: BarChart3, permission: "metrics:read" },
  { label: "Incidencias", href: "/tickets", icon: TicketCheck, permission: "tickets:read" },
  { label: "Localizaciones", href: "/locations", icon: MapPin, permission: "locations:read" },
  { label: "Salarios", href: "/salaries", icon: Banknote, permission: "salary:read" },
];

const NAV_CONFIG: NavItem[] = [
  { label: "Centros de trabajo", href: "/work-locations", icon: Building2, permission: "locations:write" },
  { label: "Upgrade", href: "/upgrade", icon: Sparkles, permission: "users:manage" },
  { label: "Configuracion", href: "/settings", icon: Settings, permission: "settings:read" },
];

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
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
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-150",
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

  const roleLabel: Record<string, string> = {
    superadmin: "Superadmin",
    owner: "Propietario",
    admin: "Administrador",
    hr_manager: "Responsable RRHH",
    manager: "Manager",
    employee: "Empleado",
  };
  const canSee = (item: NavItem) =>
    (!item.permission || permissions.includes(item.permission)) &&
    (!item.roles || item.roles.includes((role ?? "employee") as UserRole));
  const canOpenKiosk = role === "owner" || role === "admin" || role === "manager";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-border bg-surface-sidebar">
      <div className="flex h-[62px] items-center border-b border-border px-5">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <NavGroup label="Principal" items={NAV_MAIN.filter(canSee)} pathname={pathname} />
        <NavGroup label="Operativa" items={NAV_OPERATIONS.filter(canSee)} pathname={pathname} />
        <NavGroup label="Sistema" items={NAV_CONFIG.filter(canSee)} pathname={pathname} />
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
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-bg hover:text-ink"
          >
            <MonitorSmartphone className="h-[15px] w-[15px]" />
            Abrir Kiosk
          </Link>
        )}
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-ink-muted transition-all duration-150 hover:bg-danger-bg hover:text-danger-DEFAULT"
        >
          <LogOut className="h-[15px] w-[15px]" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
