"use client";

import { Topbar } from "@/components/shared/topbar";
import { EmployeeTable } from "@/features/employees/components/employee-table";
import { useMe } from "@/hooks/use-auth";
import { useEmployees } from "@/hooks/use-employees";

export default function EmployeesPage() {
  const { data, isLoading, error } = useEmployees();
  const me = useMe();
  const activeEmployees = data?.filter((employee) => employee.is_active).length ?? 0;
  const maxEmployees = me.data?.company.max_employees ?? null;
  const canCreateEmployee = maxEmployees === null || activeEmployees < maxEmployees;
  const createDisabledReason =
    maxEmployees === null
      ? undefined
      : `Limite del plan ${me.data?.company.plan_name ?? ""}: ${activeEmployees}/${maxEmployees}. Disponible ampliando plan.`;

  return (
    <>
      <Topbar title="Empleados" />
      <div className="p-6 space-y-5">
        {error && (
          <div className="rounded-md border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger-DEFAULT">
            Error al cargar empleados.
          </div>
        )}
        {!canCreateEmployee && (
          <div className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning-DEFAULT">
            {createDisabledReason}
          </div>
        )}
        <EmployeeTable
          employees={data}
          loading={isLoading}
          canCreateEmployee={canCreateEmployee}
          createDisabledReason={createDisabledReason}
        />
      </div>
    </>
  );
}
