"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  MonitorSmartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { useLogout } from "@/hooks/use-auth";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Empleados",
    href: "/employees",
    icon: Users,
  },
  {
    label: "Fichajes",
    href: "/sessions",
    icon: Clock,
  },
  {
    label: "Horarios",
    href: "/schedules",
    icon: CalendarDays,
  },
  {
    label: "Analíticas",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Configuración",
    href: "/settings",
    icon: Settings,
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-border bg-white">
      {/* Brand */}
      <div className="flex h-[70px] items-center border-b border-border px-6">
        <Logo size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-ink-muted hover:bg-surface-bg hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3 space-y-0.5">
        <Link
          href="/kiosk"
          target="_blank"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-bg hover:text-ink transition-colors"
        >
          <MonitorSmartphone className="h-4 w-4" />
          Abrir Kiosk
        </Link>
        <button
          onClick={() => logout.mutate()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:bg-danger-bg hover:text-danger transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
