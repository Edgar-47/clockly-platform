"use client";

import { useState } from "react";
import { Topbar } from "@/components/shared/topbar";
import { SessionsTable } from "@/features/attendance/components/sessions-table";
import { useAttendanceHistory } from "@/hooks/use-attendance";
import { useMe } from "@/hooks/use-auth";
import type { AttendanceHistoryFilters } from "@/types/attendance";

export default function SessionsPage() {
  const [filters, setFilters] = useState<AttendanceHistoryFilters>({});
  const { data, isLoading, error } = useAttendanceHistory(filters);
  const me = useMe();

  return (
    <>
      <Topbar title="Fichajes" />
      <div className="p-6 space-y-5">
        {error && (
          <div className="rounded-md border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger-DEFAULT">
            Error al cargar los fichajes.
          </div>
        )}
        <SessionsTable
          sessions={data}
          loading={isLoading}
          onFilterChange={setFilters}
          canExport={Boolean(me.data?.company.has_exports)}
          canUseAdvancedFilters={Boolean(me.data?.company.has_advanced_filters)}
        />
      </div>
    </>
  );
}
