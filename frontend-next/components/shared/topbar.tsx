"use client";

import { useMe } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";

interface TopbarProps {
  title: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  const { data: auth } = useMe();
  const user = auth?.user;
  const [firstName = "", ...restName] = user?.full_name.split(" ") ?? [];
  const lastName = restName.join(" ");

  const roleLabel: Record<string, string> = {
    superadmin: "Superadmin",
    owner: "Propietario",
    admin: "Administrador",
    manager: "Manager",
    employee: "Empleado",
  };

  return (
    <header className="sticky top-0 z-30 flex h-[62px] items-center border-b border-border bg-white/95 backdrop-blur-sm px-6 gap-4">
      <h1 className="text-[15px] font-semibold tracking-tight text-ink flex-1">
        {title}
      </h1>

      <div className="flex items-center gap-2.5">
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}

        {user && (
          <div className="flex items-center gap-2 ml-1 pl-3 border-l border-border">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold flex-shrink-0">
              {getInitials(firstName, lastName)}
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-semibold text-ink leading-none">
                {user.full_name}
              </p>
              <p className="text-[11px] text-ink-xmuted mt-0.5">
                {roleLabel[user.role] ?? user.role}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
