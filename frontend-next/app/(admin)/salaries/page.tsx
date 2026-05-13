"use client";

import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Save } from "lucide-react";
import { Topbar } from "@/components/shared/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployees } from "@/hooks/use-employees";
import { useMe } from "@/hooks/use-auth";
import {
  useCreateSalaryProfile,
  useGenerateSalaryCalculation,
  useSalaryCalculation,
  useSalaryProfiles,
} from "@/hooks/use-salary";
import { salaryService } from "@/services/salary.service";
import type { SalaryType } from "@/types/salary";

const SALARY_LABELS: Record<SalaryType, string> = {
  hourly: "Por hora",
  daily: "Por dia",
  shift: "Por turno",
  monthly: "Fijo mensual",
  weekly: "Por semana",
};

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function money(value: string | number, currency = "EUR") {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return `0.00 ${currency}`;
  return `${numberValue.toFixed(2)} ${currency}`;
}

export default function SalariesPage() {
  const me = useMe();
  const employeesQuery = useEmployees();
  const range = useMemo(() => currentMonthRange(), []);
  const permissions = me.data?.permissions ?? [];
  const canRead = permissions.includes("salary:read");
  const canManage = permissions.includes("salary:manage");
  const employees = employeesQuery.data ?? [];
  const [employeeId, setEmployeeId] = useState("");
  const [salaryType, setSalaryType] = useState<SalaryType>("hourly");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [effectiveFrom, setEffectiveFrom] = useState(range.start);
  const [effectiveTo, setEffectiveTo] = useState("");
  const [notes, setNotes] = useState("");
  const [periodStart, setPeriodStart] = useState(range.start);
  const [periodEnd, setPeriodEnd] = useState(range.end);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const selectedEmployeeId = employeeId || employees[0]?.id || "";
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const profilesQuery = useSalaryProfiles(selectedEmployeeId, Boolean(canRead && selectedEmployeeId));
  const calculationQuery = useSalaryCalculation(
    selectedEmployeeId,
    periodStart,
    periodEnd,
    Boolean(canRead && selectedEmployeeId && periodStart && periodEnd),
  );
  const createProfile = useCreateSalaryProfile();
  const generateCalculation = useGenerateSalaryCalculation();

  function handleCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployeeId || !amount || !effectiveFrom) return;
    createProfile.mutate(
      {
        employee_id: selectedEmployeeId,
        salary_type: salaryType,
        amount,
        currency,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          setAmount("");
          setEffectiveTo("");
          setNotes("");
          toast.success("Perfil salarial guardado.");
        },
        onError: (error: { detail?: string; message?: string }) =>
          toast.error(error.detail ?? error.message ?? "No se pudo guardar el salario."),
      },
    );
  }

  async function handleExport(format: "excel" | "pdf") {
    if (!selectedEmployeeId) return;
    try {
      setExporting(format);
      const { blob, filename } = await salaryService.downloadCalculation(format, selectedEmployeeId, periodStart, periodEnd);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? `clockly-salarios.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error((error as Error).message ?? "No se pudo exportar el calculo.");
    } finally {
      setExporting(null);
    }
  }

  if (me.data && !canRead) {
    return (
      <>
        <Topbar title="Salarios estimados" />
        <div className="p-6">
          <div className="rounded-md border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-DEFAULT">
            Tu rol no tiene permiso para ver salarios.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Salarios estimados" />
      <div className="space-y-5 p-6">
        <div className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning-DEFAULT">
          Calculo estimado basado en fichajes registrados. Revisar antes de pagar.
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trabajador y vigencia</CardTitle>
            <CardDescription>Asigna modalidad salarial sin sobrescribir historicos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)]">
              <div className="space-y-1.5">
                <Label>Trabajador</Label>
                <Select value={selectedEmployeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona trabajador" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                {selectedEmployee ? (
                  <Badge variant="outline">{selectedEmployee.role_title ?? "Empleado"}</Badge>
                ) : (
                  <span className="text-sm text-ink-muted">Sin trabajador seleccionado.</span>
                )}
              </div>
            </div>

            {canManage && (
              <form onSubmit={handleCreateProfile} className="grid gap-3 rounded-md border border-border bg-surface-bg p-4 md:grid-cols-[170px_140px_110px_150px_150px_1fr_auto] md:items-end">
                <div className="space-y-1.5">
                  <Label>Modalidad</Label>
                  <Select value={salaryType} onValueChange={(value) => setSalaryType(value as SalaryType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SALARY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Importe</Label>
                  <Input value={amount} type="number" min="0" step="0.01" onChange={(event) => setAmount(event.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <Input value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1.5">
                  <Label>Inicio</Label>
                  <Input value={effectiveFrom} type="date" onChange={(event) => setEffectiveFrom(event.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Fin opcional</Label>
                  <Input value={effectiveTo} type="date" onChange={(event) => setEffectiveTo(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notas</Label>
                  <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Contrato, pacto o revision" />
                </div>
                <Button type="submit" loading={createProfile.isPending} disabled={!selectedEmployeeId}>
                  <Save className="h-4 w-4" />
                  Guardar
                </Button>
              </form>
            )}

            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-bg text-[11px] uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Modalidad</th>
                    <th className="px-3 py-2 font-semibold">Importe</th>
                    <th className="px-3 py-2 font-semibold">Vigencia</th>
                    <th className="px-3 py-2 font-semibold">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {profilesQuery.data?.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-3 py-3">{SALARY_LABELS[profile.salary_type]}</td>
                      <td className="px-3 py-3">{money(profile.amount, profile.currency)}</td>
                      <td className="px-3 py-3">
                        {profile.effective_from} - {profile.effective_to ?? "actual"}
                      </td>
                      <td className="px-3 py-3 text-ink-muted">{profile.notes ?? "-"}</td>
                    </tr>
                  ))}
                  {!profilesQuery.isLoading && profilesQuery.data?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-ink-muted">
                        Sin historial salarial para este trabajador.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calculo por periodo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-[160px_160px_auto_auto_auto] md:items-end">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
              </div>
              <Button
                variant="secondary"
                loading={generateCalculation.isPending}
                disabled={!canManage || !calculationQuery.data}
                onClick={() =>
                  generateCalculation.mutate(
                    { employeeId: selectedEmployeeId, periodStart, periodEnd },
                    {
                      onSuccess: () => toast.success("Calculo guardado."),
                      onError: (error: { detail?: string; message?: string }) =>
                        toast.error(error.detail ?? error.message ?? "No se pudo guardar el calculo."),
                    },
                  )
                }
              >
                Guardar calculo
              </Button>
              <Button variant="secondary" loading={exporting === "excel"} onClick={() => handleExport("excel")}>
                <Download className="h-4 w-4" />
                XLSX
              </Button>
              <Button variant="secondary" loading={exporting === "pdf"} onClick={() => handleExport("pdf")}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
            </div>

            {calculationQuery.error && (
              <div className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning-DEFAULT">
                No hay un perfil salarial aplicable o el periodo no es valido.
              </div>
            )}

            {calculationQuery.data && (
              <>
                <div className="grid gap-4 md:grid-cols-5">
                  <Summary label="Total estimado" value={money(calculationQuery.data.gross_estimated_amount, calculationQuery.data.currency)} />
                  <Summary label="Horas" value={calculationQuery.data.total_hours} />
                  <Summary label="Dias" value={calculationQuery.data.total_days} />
                  <Summary label="Turnos" value={calculationQuery.data.total_shifts} />
                  <Summary label="Incidencias" value={calculationQuery.data.incident_count} />
                </div>
                {calculationQuery.data.open_sessions_ignored > 0 && (
                  <div className="flex items-center gap-2 rounded-md border border-warning-border bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning-DEFAULT">
                    <AlertTriangle className="h-4 w-4" />
                    {calculationQuery.data.open_sessions_ignored} sesiones abiertas ignoradas.
                  </div>
                )}
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-bg text-[11px] uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Tramo</th>
                        <th className="px-3 py-2 font-semibold">Modalidad</th>
                        <th className="px-3 py-2 font-semibold">Horas</th>
                        <th className="px-3 py-2 font-semibold">Dias</th>
                        <th className="px-3 py-2 font-semibold">Turnos</th>
                        <th className="px-3 py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                      {calculationQuery.data.lines.map((line) => (
                        <tr key={line.salary_profile_id}>
                          <td className="px-3 py-3">{line.period_start} - {line.period_end}</td>
                          <td className="px-3 py-3">{SALARY_LABELS[line.salary_type]}</td>
                          <td className="px-3 py-3">{line.total_hours}</td>
                          <td className="px-3 py-3">{line.total_days}</td>
                          <td className="px-3 py-3">{line.total_shifts}</td>
                          <td className="px-3 py-3 font-semibold">{money(line.gross_estimated_amount, line.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}
