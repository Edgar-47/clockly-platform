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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
              "group relative flex flex-col items-center gap-3 rounded-3xl border p-4 text-center transition-all duration-200 active:scale-[0.96] sm:gap-3.5 sm:p-5",
              is_clocked_in
                ? "bg-[#F0FDF4] border-[#34C759]/20 shadow-sm hover:shadow-md hover:border-[#34C759]/40"
                : "bg-white border-black/[0.06] shadow-sm hover:shadow-md hover:border-black/[0.12]",
            )}
          >
            {/* Clocked-in indicator dot */}
            {is_clocked_in && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[#34C759] animate-pulse-dot" />
            )}

            {/* Avatar */}
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl text-[15px] font-bold text-white shadow-sm sm:h-16 sm:w-16 sm:rounded-2xl sm:text-[19px]",
                bg,
              )}
            >
              {initials}
            </div>

            {/* Name */}
            <div className="w-full space-y-0.5">
              <p className="truncate text-[12px] font-semibold text-[#1C1C1E] leading-tight sm:text-[13px]">
                {employee.first_name}
              </p>
              <p className="truncate text-[12px] font-semibold text-[#1C1C1E] leading-tight sm:text-[13px]">
                {employee.last_name}
              </p>
            </div>

            {/* Status badge */}
            {is_clocked_in ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/10 border border-[#34C759]/20 px-2.5 py-1 text-[10px] font-semibold text-[#34C759] sm:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34C759] flex-shrink-0" />
                {clockInTime ?? "Fichado"}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-black/[0.04] border border-black/[0.06] px-2.5 py-1 text-[10px] font-medium text-[#8E8E93] sm:text-[11px]">
                Libre
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
