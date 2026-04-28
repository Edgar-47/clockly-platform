"use client";

import { cn, getInitials } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { useKioskStore } from "@/features/kiosk/kiosk.store";
import type { AttendanceStatus } from "@/types/attendance";

interface EmployeeGridProps {
  statuses: AttendanceStatus[];
}

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-teal-500",
];

function avatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function EmployeeGrid({ statuses }: EmployeeGridProps) {
  const selectEmployee = useKioskStore((s) => s.selectEmployee);

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {statuses.map((status) => {
        const { employee, is_clocked_in } = status;
        const initials = getInitials(employee.first_name, employee.last_name);
        const bg = avatarBg(employee.full_name);
        const clockInTime =
          is_clocked_in && status.active_session
            ? formatTime(status.active_session.clock_in_time)
            : null;

        return (
          <button
            key={employee.id}
            type="button"
            onClick={() => selectEmployee(status)}
            className={cn(
              "group relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-200 active:scale-[0.96]",
              is_clocked_in
                ? "border-emerald-500/25 bg-emerald-500/[0.07] hover:border-emerald-500/40 hover:bg-emerald-500/[0.12]"
                : "border-white/[0.07] bg-white/[0.04] hover:border-white/[0.14] hover:bg-white/[0.08]",
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl text-[18px] font-bold text-white",
                bg,
              )}
            >
              {initials}
            </div>

            {/* Name */}
            <div className="space-y-0.5">
              <p className="text-[13px] font-semibold text-white/90 leading-tight">
                {employee.first_name}
              </p>
              <p className="text-[13px] font-semibold text-white/90 leading-tight">
                {employee.last_name}
              </p>
            </div>

            {/* Status */}
            {is_clocked_in ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot flex-shrink-0" />
                {clockInTime ? `Fichado · ${clockInTime}` : "Fichado"}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-white/[0.05] border border-white/[0.07] px-2.5 py-0.5 text-[11px] font-medium text-white/25">
                Libre
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
