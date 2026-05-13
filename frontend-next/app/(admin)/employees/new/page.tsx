"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/shared/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmployeeForm } from "@/features/employees/components/employee-form";
import { useMe } from "@/hooks/use-auth";
import { useCreateEmployee, useEmployees } from "@/hooks/use-employees";
import type { EmployeeCreateRequest, EmployeeUpdateRequest } from "@/types/employee";

export default function NewEmployeePage() {
  const router = useRouter();
  const create = useCreateEmployee();
  const me = useMe();
  const employees = useEmployees();
  const activeEmployees = employees.data?.filter((employee) => employee.is_active).length ?? 0;
  const maxEmployees = me.data?.company.max_employees ?? null;
  const hasReachedLimit = maxEmployees !== null && activeEmployees >= maxEmployees;

  const handleSubmit = (values: EmployeeCreateRequest | EmployeeUpdateRequest) => {
    create.mutate(values as EmployeeCreateRequest, {
      onSuccess: (employee) => {
        toast.success(`Empleado ${employee.full_name} creado correctamente.`);
        router.push("/employees");
      },
      onError: (err) => {
        toast.error(
          (err as { detail?: string })?.detail ?? "Error al crear el empleado.",
        );
      },
    });
  };

  return (
    <>
      <Topbar
        title="Nuevo empleado"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/employees")}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        }
      />
      <div className="p-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Datos del empleado</CardTitle>
            <CardDescription>
              Rellena los campos para dar de alta al nuevo empleado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasReachedLimit ? (
              <div className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-DEFAULT">
                Has alcanzado el limite de {maxEmployees} empleados del plan {me.data?.company.plan_name}. Disponible ampliando plan.
              </div>
            ) : (
              <EmployeeForm
                onSubmit={handleSubmit}
                loading={create.isPending}
                error={
                  create.isError
                    ? ((create.error as { detail?: string })?.detail ??
                      "Error inesperado")
                    : null
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
