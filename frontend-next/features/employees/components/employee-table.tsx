"use client";

import { useState, useDeferredValue, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { getInitials } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { Employee } from "@/types/employee";
import { useSetEmployeeActive } from "@/hooks/use-employees";

interface EmployeeTableProps {
  employees?: Employee[];
  loading?: boolean;
  canCreateEmployee?: boolean;
  createDisabledReason?: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  employee: "Empleado",
};

export function EmployeeTable({
  employees,
  loading,
  canCreateEmployee = true,
  createDisabledReason,
}: EmployeeTableProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const router = useRouter();
  const setActive = useSetEmployeeActive();

  const filtered = useMemo(() => {
    if (!employees) return undefined;
    const q = deferredSearch.toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.dni?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q),
    );
  }, [employees, deferredSearch]);

  const handleToggleActive = (e: React.MouseEvent, employee: Employee) => {
    e.stopPropagation();
    setActive.mutate(
      { id: employee.id, isActive: !employee.is_active },
      {
        onSuccess: () => toast.success("Estado actualizado."),
        onError: () => toast.error("No se pudo actualizar el empleado."),
      },
    );
  };

  return (
    <div className="rounded-lg border border-border bg-white shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-2.5 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-xmuted" />
          <Input
            placeholder="Buscar empleados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          size="sm"
          disabled={!canCreateEmployee}
          title={!canCreateEmployee ? createDisabledReason : undefined}
          onClick={() => router.push("/employees/new")}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nuevo empleado
        </Button>
      </div>

      {/* ── MOBILE CARD LIST (< md) ─────────────────────── */}
      <div className="divide-y divide-border md:hidden">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}

        {!loading && filtered?.length === 0 && (
          <EmptyState
            title="Sin empleados"
            description="Crea el primer empleado para empezar."
            action={
              canCreateEmployee
                ? { label: "Nuevo empleado", onClick: () => router.push("/employees/new") }
                : undefined
            }
          />
        )}

        {!loading &&
          filtered?.map((employee) => (
            <div
              key={employee.id}
              className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-surface-muted/60 transition-colors"
              onClick={() => router.push(`/employees/${employee.id}`)}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                {getInitials(employee.first_name, employee.last_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink">{employee.full_name}</p>
                {employee.email && (
                  <p className="truncate text-[11px] text-ink-muted">{employee.email}</p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {employee.is_active ? (
                  <Badge variant="success">Activo</Badge>
                ) : (
                  <Badge variant="danger">Inactivo</Badge>
                )}
                <ChevronRight className="h-4 w-4 text-ink-xmuted" />
              </div>
            </div>
          ))}
      </div>

      {/* ── DESKTOP TABLE (≥ md) ────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left">
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Empleado
              </th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                DNI
              </th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Rol
              </th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Estado
              </th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Alta
              </th>
              <th className="px-5 py-3" scope="col"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </td>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-5 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  ))}
                  <td className="px-5 py-3" />
                </tr>
              ))}

            {!loading && filtered?.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="Sin empleados"
                    description="Crea el primer empleado para empezar."
                    action={
                      canCreateEmployee
                        ? { label: "Nuevo empleado", onClick: () => router.push("/employees/new") }
                        : undefined
                    }
                  />
                </td>
              </tr>
            )}

            {!loading &&
              filtered?.map((employee) => (
                <tr
                  key={employee.id}
                  className="hover:bg-surface-muted/60 cursor-pointer transition-colors duration-100"
                  onClick={() => router.push(`/employees/${employee.id}`)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        {getInitials(employee.first_name, employee.last_name)}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-ink">{employee.full_name}</p>
                        {employee.email && (
                          <p className="text-[11px] text-ink-muted">{employee.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted">
                    {employee.dni ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="muted">
                      {employee.role_title ?? ROLE_LABELS.employee}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    {employee.is_active ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="danger">Inactivo</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted">
                    {formatDate(employee.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(e, employee)}
                      className="rounded px-2 py-1 text-[12px] font-medium text-ink-muted hover:bg-surface-bg hover:text-ink transition-colors duration-100"
                    >
                      {employee.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered && (
        <div className="border-t border-border px-4 py-3 text-xs text-ink-muted sm:px-6">
          {filtered.length} empleado{filtered.length !== 1 ? "s" : ""}
          {search && ` (filtrado de ${employees?.length ?? 0})`}
        </div>
      )}
    </div>
  );
}
