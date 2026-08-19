"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, MailPlus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/shared/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployees } from "@/hooks/use-employees";
import {
  useCompleteOnboarding,
  useConfigureKioskPin,
  useCreateOnboardingEmployee,
  useCreateOnboardingInvitation,
  useOnboardingStatus,
  useSkipOnboardingInvitations,
  useUpdateOnboardingCompany,
} from "@/hooks/use-onboarding";
import type { UserRole } from "@/types/auth";

type StepKey = "company" | "employee" | "kiosk" | "invitations" | "finish";

const STEPS: Array<{ key: StepKey; label: string; index: number }> = [
  { key: "company", label: "Empresa", index: 1 },
  { key: "employee", label: "Empleado", index: 2 },
  { key: "kiosk", label: "Kiosk PIN", index: 3 },
  { key: "invitations", label: "Invitar", index: 4 },
  { key: "finish", label: "Final", index: 5 },
];

const TIMEZONES = ["Europe/Madrid", "UTC", "Europe/Lisbon", "Europe/Paris", "Europe/London"];

const SECTORS = [
  "Hostelería y restauración",
  "Comercio y retail",
  "Salud y bienestar",
  "Estética y peluquería",
  "Fitness y deporte",
  "Limpieza y mantenimiento",
  "Logística y transporte",
  "Educación",
  "Tecnología",
  "Servicios profesionales",
  "Otro",
];

const COMPANY_SIZES = [
  { value: "1-5", label: "1–5 empleados" },
  { value: "6-15", label: "6–15 empleados" },
  { value: "16-50", label: "16–50 empleados" },
  { value: "51-200", label: "51–200 empleados" },
  { value: "200+", label: "Más de 200" },
];

const INVITE_ROLES: Array<{ value: UserRole; label: string }> = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Empleado" },
];

function normalizeStep(step?: string): StepKey {
  if (step === "employee" || step === "kiosk" || step === "invitations") return step;
  if (step === "complete") return "finish";
  return "company";
}

function errorMessage(error: unknown, fallback: string) {
  return (error as { detail?: string })?.detail ?? fallback;
}

export default function OnboardingPage() {
  const router = useRouter();
  const statusQuery = useOnboardingStatus();
  const employeesQuery = useEmployees();
  const updateCompany = useUpdateOnboardingCompany();
  const createEmployee = useCreateOnboardingEmployee();
  const configureKioskPin = useConfigureKioskPin();
  const createInvitation = useCreateOnboardingInvitation();
  const skipInvitations = useSkipOnboardingInvitations();
  const completeOnboarding = useCompleteOnboarding();

  const status = statusQuery.data;
  const [manualStep, setManualStep] = useState<StepKey | null>(null);
  const [companyDraft, setCompanyDraft] = useState<{
    companyName?: string;
    timezone?: string;
    sector?: string;
    companySize?: string;
    country?: string;
  } | null>(null);
  const [employeeFirstName, setEmployeeFirstName] = useState("");
  const [employeeLastName, setEmployeeLastName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeRoleTitle, setEmployeeRoleTitle] = useState("");
  const [employeePin, setEmployeePin] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [kioskPin, setKioskPin] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("manager");
  const [lastInvitationUrl, setLastInvitationUrl] = useState<string | null>(null);

  const employeeOptions = useMemo(
    () => (employeesQuery.data ?? []).filter((employee) => employee.is_active),
    [employeesQuery.data],
  );
  const effectiveSelectedEmployeeId = selectedEmployeeId || employeeOptions[0]?.id || "";

  function handleCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status) return;
    updateCompany.mutate(
      {
        company_name: companyDraft?.companyName ?? status.company_name,
        timezone: companyDraft?.timezone ?? status.timezone,
        sector: companyDraft?.sector ?? undefined,
        company_size: companyDraft?.companySize ?? undefined,
        country: companyDraft?.country ?? undefined,
      },
      {
        onSuccess: () => {
          setCompanyDraft(null);
          setManualStep("employee");
          toast.success("Empresa actualizada.");
        },
        onError: (error) => toast.error(errorMessage(error, "No se pudo actualizar la empresa.")),
      },
    );
  }

  function handleEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createEmployee.mutate(
      {
        first_name: employeeFirstName,
        last_name: employeeLastName,
        email: employeeEmail || undefined,
        role_title: employeeRoleTitle || undefined,
        pin: employeePin || undefined,
      },
      {
        onSuccess: (response) => {
          setSelectedEmployeeId(response.employee.id);
          setEmployeeFirstName("");
          setEmployeeLastName("");
          setEmployeeEmail("");
          setEmployeeRoleTitle("");
          setEmployeePin("");
          setManualStep("kiosk");
          toast.success("Empleado creado.");
        },
        onError: (error) => toast.error(errorMessage(error, "No se pudo crear el empleado.")),
      },
    );
  }

  function handleKioskPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    configureKioskPin.mutate(
      { employee_id: effectiveSelectedEmployeeId, pin: kioskPin },
      {
        onSuccess: () => {
          setKioskPin("");
          setManualStep("invitations");
          toast.success("PIN de kiosk configurado.");
        },
        onError: (error) => toast.error(errorMessage(error, "No se pudo guardar el PIN.")),
      },
    );
  }

  function handleInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createInvitation.mutate(
      { email: inviteEmail, role: inviteRole },
      {
        onSuccess: (response) => {
          setInviteEmail("");
          setLastInvitationUrl(response.invitation.acceptance_url);
          setManualStep("finish");
          toast.success("Invitacion enviada.");
        },
        onError: (error) => toast.error(errorMessage(error, "No se pudo enviar la invitación.")),
      },
    );
  }

  function handleSkipInvitations() {
    skipInvitations.mutate(undefined, {
      onSuccess: () => {
        setManualStep("finish");
        toast.success("Invitaciones omitidas por ahora.");
      },
      onError: (error) => toast.error(errorMessage(error, "No se pudo continuar.")),
    });
  }

  function handleComplete() {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        setManualStep("finish");
        toast.success("Onboarding completado.");
        router.replace("/dashboard");
      },
      onError: (error) => toast.error(errorMessage(error, "Completa empleado y PIN antes de finalizar.")),
    });
  }

  if (statusQuery.isLoading) {
    return (
      <>
        <Topbar title="Onboarding" />
        <div className="p-6 text-sm text-ink-muted">Cargando onboarding...</div>
      </>
    );
  }

  if (statusQuery.error || !status) {
    return (
      <>
        <Topbar title="Onboarding" />
        <div className="p-6">
          <div className="rounded-md border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger-DEFAULT">
            No se pudo cargar el onboarding.
          </div>
        </div>
      </>
    );
  }

  const activeStep = manualStep ?? normalizeStep(status.onboarding_step);
  const activeIndex = STEPS.findIndex((s) => s.key === activeStep);
  const PROGRESS_CLASSES = ["w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"] as const;
  const progressClass = PROGRESS_CLASSES[Math.min(activeIndex, PROGRESS_CLASSES.length - 1)];
  const companyName = companyDraft?.companyName ?? status.company_name;
  const timezone = companyDraft?.timezone ?? status.timezone;

  return (
    <>
      <Topbar title="Onboarding" />
      <div className="space-y-5 p-6">
        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold text-ink">Configuración inicial</span>
            <span className="text-ink-muted">{activeIndex + 1} de {STEPS.length}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-bg overflow-hidden">
            <div className={`h-full rounded-full bg-primary transition-all duration-500 ${progressClass}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            {STEPS.map((step) => {
              const active = activeStep === step.key;
              const done = step.index < (activeIndex + 1);
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setManualStep(step.key)}
                  className={`flex h-8 items-center gap-1.5 rounded border px-2.5 text-[12px] font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : done
                        ? "border-success-border bg-success-bg text-success-DEFAULT"
                        : "border-border bg-white text-ink-muted hover:text-ink"
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${active ? "bg-primary text-white" : done ? "bg-success text-white" : "bg-surface-bg text-ink-xmuted"}`}>
                    {done ? "✓" : step.index}
                  </span>
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <section className="space-y-5">
            {activeStep === "company" && (
              <Card>
                <CardHeader>
                  <CardTitle>Datos de empresa</CardTitle>
                  <CardDescription>Confirma la información base del tenant.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCompany} className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="company-name">Nombre de empresa</Label>
                      <Input
                        id="company-name"
                        value={companyName}
                        onChange={(event) => setCompanyDraft((draft) => ({ ...(draft ?? {}), companyName: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Zona horaria</Label>
                      <Select
                        value={timezone}
                        onValueChange={(value) => setCompanyDraft((draft) => ({ ...(draft ?? {}), timezone: value }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sector <span className="text-ink-xmuted text-[11px]">(opcional)</span></Label>
                      <Select
                        value={companyDraft?.sector ?? ""}
                        onValueChange={(value) => setCompanyDraft((draft) => ({ ...(draft ?? {}), sector: value }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Elige sector…" /></SelectTrigger>
                        <SelectContent>
                          {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tamaño de equipo <span className="text-ink-xmuted text-[11px]">(opcional)</span></Label>
                      <Select
                        value={companyDraft?.companySize ?? ""}
                        onValueChange={(value) => setCompanyDraft((draft) => ({ ...(draft ?? {}), companySize: value }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Número de empleados…" /></SelectTrigger>
                        <SelectContent>
                          {COMPANY_SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" loading={updateCompany.isPending}>Guardar y seguir</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeStep === "employee" && (
              <Card>
                <CardHeader>
                  <CardTitle>Primer empleado</CardTitle>
                  <CardDescription>Crea el primer perfil operativo de la empresa.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEmployee} className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="employee-first-name">Nombre</Label>
                      <Input id="employee-first-name" value={employeeFirstName} onChange={(event) => setEmployeeFirstName(event.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="employee-last-name">Apellidos</Label>
                      <Input id="employee-last-name" value={employeeLastName} onChange={(event) => setEmployeeLastName(event.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="employee-email">Email</Label>
                      <Input id="employee-email" type="email" value={employeeEmail} onChange={(event) => setEmployeeEmail(event.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="employee-role-title">Puesto</Label>
                      <Input id="employee-role-title" value={employeeRoleTitle} onChange={(event) => setEmployeeRoleTitle(event.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="employee-pin">PIN kiosk</Label>
                      <Input id="employee-pin" inputMode="numeric" minLength={4} maxLength={4} value={employeePin} onChange={(event) => setEmployeePin(event.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" loading={createEmployee.isPending}>
                        <UserPlus className="h-4 w-4" />
                        Crear empleado
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeStep === "kiosk" && (
              <Card>
                <CardHeader>
                  <CardTitle>PIN de kiosk</CardTitle>
                  <CardDescription>Configura un PIN de 4 digitos para fichar desde kiosk.</CardDescription>
                </CardHeader>
                <CardContent>
                  {employeeOptions.length === 0 ? (
                    <div className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-3 text-sm text-warning-DEFAULT">
                      Crea al menos un empleado antes de configurar el PIN.
                    </div>
                  ) : (
                    <form onSubmit={handleKioskPin} className="grid gap-4 md:grid-cols-[1fr_160px_auto] md:items-end">
                      <div className="space-y-1.5">
                        <Label>Empleado</Label>
                        <Select value={effectiveSelectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {employeeOptions.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="kiosk-pin">PIN</Label>
                        <Input id="kiosk-pin" inputMode="numeric" minLength={4} maxLength={4} value={kioskPin} onChange={(event) => setKioskPin(event.target.value)} required />
                      </div>
                      <Button type="submit" loading={configureKioskPin.isPending}>
                        <KeyRound className="h-4 w-4" />
                        Guardar
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {activeStep === "invitations" && (
              <Card>
                <CardHeader>
                  <CardTitle>Invitar equipo</CardTitle>
                  <CardDescription>Invita admins, managers o empleados. Puedes omitir este paso y hacerlo despues.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleInvitation} className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input id="invite-email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rol</Label>
                      <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INVITE_ROLES.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" loading={createInvitation.isPending}>
                      <MailPlus className="h-4 w-4" />
                      Invitar
                    </Button>
                  </form>

                  {lastInvitationUrl && (
                    <div className="rounded-md border border-success-border bg-success-bg px-3.5 py-2.5 text-[13px] text-success-DEFAULT">
                      Invitacion creada. Enlace: <span className="break-all font-semibold">{lastInvitationUrl}</span>
                    </div>
                  )}

                  <Button type="button" variant="secondary" onClick={handleSkipInvitations} loading={skipInvitations.isPending}>
                    Omitir por ahora
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeStep === "finish" && (
              <Card>
                <CardHeader>
                  <CardTitle>Listo para usar</CardTitle>
                  <CardDescription>Revisa los requisitos y abre el dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {status.onboarding_completed_at ? (
                    <div className="flex items-start gap-3 rounded-md border border-success-border bg-success-bg px-3.5 py-3 text-sm text-success-DEFAULT">
                      <CheckCircle2 className="mt-0.5 h-4 w-4" />
                      Onboarding completado.
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-md border border-warning-border bg-warning-bg px-3.5 py-3 text-sm text-warning-DEFAULT">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      Necesitas al menos un empleado y un PIN de kiosk para finalizar.
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {!status.onboarding_completed_at && (
                      <Button type="button" onClick={handleComplete} loading={completeOnboarding.isPending}>
                        Finalizar onboarding
                      </Button>
                    )}
                    <Button asChild variant="secondary">
                      <Link href="/dashboard">Ir al dashboard</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <aside className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <StatusLine label="Empresa" done={Boolean(status.company_name)} />
                <StatusLine label="Primer empleado" done={status.employee_count > 0} />
                <StatusLine label="PIN kiosk" done={status.has_kiosk_pin} />
                <StatusLine label="Invitaciones" done={Boolean(status.invitations_completed_at)} />
                <StatusLine label="Completado" done={Boolean(status.onboarding_completed_at)} />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

function StatusLine({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <Badge variant={done ? "success" : "muted"}>{done ? "OK" : "Pendiente"}</Badge>
    </div>
  );
}
