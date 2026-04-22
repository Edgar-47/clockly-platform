"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Plus, ReceiptText, WalletCards } from "lucide-react";
import { Topbar } from "@/components/shared/topbar";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees } from "@/hooks/use-employees";

type ExpenseStatus = "pending" | "approved" | "paid";

interface ExpenseItem {
  id: string;
  employee_id: string | null;
  employee_name: string;
  concept: string;
  amount: number;
  spent_on: string;
  status: ExpenseStatus;
}

const STORAGE_KEY = "clockly_expenses";

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  paid: "Pagado",
};

const STATUS_VARIANTS: Record<ExpenseStatus, "warning" | "success" | "muted"> = {
  pending: "warning",
  approved: "success",
  paid: "muted",
};

function money(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function ExpensesPage() {
  const employees = useEmployees();
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("none");
  const [status, setStatus] = useState<ExpenseStatus>("pending");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setItems(JSON.parse(raw) as ExpenseItem[]);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const totals = useMemo(
    () => ({
      pending: items
        .filter((item) => item.status === "pending")
        .reduce((sum, item) => sum + item.amount, 0),
      approved: items
        .filter((item) => item.status === "approved")
        .reduce((sum, item) => sum + item.amount, 0),
      paid: items
        .filter((item) => item.status === "paid")
        .reduce((sum, item) => sum + item.amount, 0),
    }),
    [items],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const concept = String(form.get("concept") ?? "").trim();
    const amount = Number(form.get("amount") ?? 0);
    const spentOn = String(form.get("spent_on") ?? "");
    if (!concept || amount <= 0 || !spentOn) return;

    const employee =
      employees.data?.find((item) => item.id === employeeId) ?? null;
    setItems((current) => [
      {
        id: crypto.randomUUID(),
        employee_id: employee?.id ?? null,
        employee_name: employee?.full_name ?? "Sin empleado",
        concept,
        amount,
        spent_on: spentOn,
        status,
      },
      ...current,
    ]);
    event.currentTarget.reset();
    setEmployeeId("none");
    setStatus("pending");
  };

  return (
    <>
      <Topbar title="Gastos" />
      <div className="space-y-6 p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Pendiente"
            value={money(totals.pending)}
            icon={<Clock3 className="h-5 w-5" />}
            iconColor="orange"
          />
          <StatCard
            label="Aprobado"
            value={money(totals.approved)}
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconColor="green"
          />
          <StatCard
            label="Pagado"
            value={money(totals.paid)}
            icon={<WalletCards className="h-5 w-5" />}
            iconColor="blue"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Nuevo gasto</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="concept">Concepto</Label>
                  <Input id="concept" name="concept" placeholder="Taxi, material, comida..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Importe</Label>
                  <Input id="amount" name="amount" type="number" min="0" step="0.01" placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spent_on">Fecha</Label>
                  <Input id="spent_on" name="spent_on" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Empleado</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin empleado</SelectItem>
                      {employees.data?.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as ExpenseStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4" />
                  Guardar gasto
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Listado de gastos</CardTitle>
              <Badge variant="outline">{items.length} registros</Badge>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ReceiptText className="h-10 w-10 text-ink-xmuted" />
                  <p className="mt-3 text-sm text-ink-muted">No hay gastos registrados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        <th className="py-3 pr-4">Concepto</th>
                        <th className="py-3 pr-4">Empleado</th>
                        <th className="py-3 pr-4">Fecha</th>
                        <th className="py-3 pr-4">Importe</th>
                        <th className="py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 pr-4 font-medium text-ink">{item.concept}</td>
                          <td className="py-3 pr-4 text-ink-muted">{item.employee_name}</td>
                          <td className="py-3 pr-4 text-ink-muted">{item.spent_on}</td>
                          <td className="py-3 pr-4 font-semibold text-ink">{money(item.amount)}</td>
                          <td className="py-3">
                            <Badge variant={STATUS_VARIANTS[item.status]}>
                              {STATUS_LABELS[item.status]}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
