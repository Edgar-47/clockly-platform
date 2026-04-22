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

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center border-b border-border bg-white/90 backdrop-blur px-8">
      <h1 className="text-lg font-bold tracking-tight text-ink flex-1">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {actions}

        {user && (
          <div className="flex items-center gap-2.5 ml-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {getInitials(user.first_name, user.last_name)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-ink leading-none">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
