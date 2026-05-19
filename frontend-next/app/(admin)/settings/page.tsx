"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock3, CreditCard, MailPlus, ShieldCheck, UserMinus } from "lucide-react";
import { Topbar } from "@/components/shared/topbar";
import { PlanCards } from "@/components/shared/plan-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe } from "@/hooks/use-auth";
import { useAutoClockOutSettings, useUpdateAutoClockOutSettings } from "@/hooks/use-settings";
import { membersService } from "@/services/members.service";
import { billingService } from "@/services/billing.service";
import type { UserRole } from "@/types/auth";
import type { InvitationCreateResponse, Member } from "@/types/member";

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Superadmin",
  owner: "Propietario",
  admin: "Administrador",
  hr_manager: "Responsable RRHH",
  manager: "Manager",
  employee: "Empleado",
};

const INVITATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  expired: "Expirada",
  revoked: "Revocada",
};

function manageableRoles(actorRole?: UserRole): UserRole[] {
  if (actorRole === "owner") return ["admin", "hr_manager", "manager", "employee"];
  if (actorRole === "admin") return ["hr_manager", "manager", "employee"];
  return [];
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const me = useMe();
  const company = me.data?.company;
  const actor = me.data?.user;
  const permissions = me.data?.permissions ?? [];
  const canReadSettings = permissions.includes("settings:read");
  const canWriteSettings = permissions.includes("settings:write");
  const canManageMembers = me.data?.permissions.includes("users:manage") ?? false;
  const roleOptions = useMemo(() => manageableRoles(actor?.role), [actor?.role]);
  const defaultInviteRole = roleOptions.at(-1) ?? "employee";

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(defaultInviteRole);
  const [lastInvitation, setLastInvitation] = useState<InvitationCreateResponse | null>(null);
  const [autoDraft, setAutoDraft] = useState<{
    enabled?: boolean;
    time?: string;
    timezone?: string;
    grace?: number;
  }>({});

  const autoClockOutQuery = useAutoClockOutSettings(canReadSettings);
  const updateAutoClockOut = useUpdateAutoClockOutSettings();
  const autoEnabled = autoDraft.enabled ?? autoClockOutQuery.data?.auto_clock_out_enabled ?? false;
  const autoTime = autoDraft.time ?? autoClockOutQuery.data?.auto_clock_out_time?.slice(0, 5) ?? "";
  const autoTimezone = autoDraft.timezone ?? autoClockOutQuery.data?.auto_clock_out_timezone ?? company?.timezone ?? "";
  const autoGrace = autoDraft.grace ?? autoClockOutQuery.data?.auto_clock_out_grace_minutes ?? 0;

  const membersQuery = useQuery({
    queryKey: ["members", company?.id],
    queryFn: () => membersService.listMembers(company!.id),
    enabled: Boolean(company?.id && canManageMembers),
  });

  const invitationsQuery = useQuery({
    queryKey: ["invitations", company?.id],
    queryFn: () => membersService.listInvitations(company!.id),
    enabled: Boolean(company?.id && canManageMembers),
  });

  const invalidateMembers = () => {
    void queryClient.invalidateQueries({ queryKey: ["members", company?.id] });
    void queryClient.invalidateQueries({ queryKey: ["invitations", company?.id] });
  };

  const createInvitation = useMutation({
    mutationFn: () =>
      membersService.createInvitation(company!.id, {
        email: inviteEmail,
        role: inviteRole,
      }),
    onSuccess: (invitation) => {
      setInviteEmail("");
      setLastInvitation(invitation);
      invalidateMembers();
      toast.success("Invitación creada.");
    },
    onError: (error: { detail?: string }) => {
      toast.error(error.detail ?? "No se pudo crear la invitación.");
    },
  });

  const revokeInvitation = useMutation({
    mutationFn: (invitationId: string) => membersService.revokeInvitation(company!.id, invitationId),
    onSuccess: () => {
      invalidateMembers();
      toast.success("Invitación revocada.");
    },
    onError: (error: { detail?: string }) => {
      toast.error(error.detail ?? "No se pudo revocar la invitación.");
    },
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      membersService.changeRole(company!.id, userId, role),
    onSuccess: () => {
      invalidateMembers();
      toast.success("Rol actualizado.");
    },
    onError: (error: { detail?: string }) => {
      toast.error(error.detail ?? "No se pudo actualizar el rol.");
    },
  });

  const revokeMember = useMutation({
    mutationFn: (userId: string) => membersService.revokeMember(company!.id, userId),
    onSuccess: () => {
      invalidateMembers();
      toast.success("Acceso revocado.");
    },
    onError: (error: { detail?: string }) => {
      toast.error(error.detail ?? "No se pudo revocar el acceso.");
    },
  });

  const openBillingPortal = useMutation({
    mutationFn: () => billingService.portal(window.location.href),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail ?? error.message ?? "No se pudo abrir el portal de facturacion.");
    },
  });

  function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company || !inviteEmail.trim()) return;
    createInvitation.mutate();
  }

  function handleSaveAutoClockOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWriteSettings) return;
    if (autoEnabled && !autoTime) {
      toast.error("Define una hora límite para activar el desfichaje automático.");
      return;
    }
    updateAutoClockOut.mutate(
      {
        auto_clock_out_enabled: autoEnabled,
        auto_clock_out_time: autoTime || null,
        auto_clock_out_timezone: autoTimezone || company?.timezone || null,
        auto_clock_out_grace_minutes: autoGrace,
      },
      {
        onSuccess: () => {
          setAutoDraft({});
          toast.success("Desfichaje automático actualizado.");
        },
        onError: (error: { detail?: string; message?: string }) =>
          toast.error(error.detail ?? error.message ?? "No se pudo guardar la configuración."),
      },
    );
  }

  function handleRevokeMember(member: Member) {
    if (!window.confirm(`¿Revocar el acceso de ${member.full_name}?`)) return;
    revokeMember.mutate(member.id);
  }

  if (me.data && !canReadSettings) {
    return (
      <>
        <Topbar title="Configuración" />
        <div className="p-6">
          <div className="rounded-md border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-DEFAULT">
            Tu rol no puede acceder a la configuración del local o empresa.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Configuración" />
      <div className="space-y-5 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Empresa activa</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="mb-1 text-[12px] font-medium text-ink-muted">Nombre</dt>
                <dd className="text-[14px] font-semibold text-ink">{company?.name ?? "-"}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[12px] font-medium text-ink-muted">Slug</dt>
                <dd className="text-[14px] font-semibold text-ink">{company?.slug ?? "-"}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[12px] font-medium text-ink-muted">Zona horaria</dt>
                <dd className="text-[14px] font-semibold text-ink">{company?.timezone ?? "-"}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                loading={openBillingPortal.isPending}
                onClick={() => openBillingPortal.mutate()}
              >
                <CreditCard className="h-4 w-4" />
                Gestionar facturacion
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              Desfichaje automático
            </CardTitle>
            <CardDescription>
              Cierra sesiones abiertas al superar la hora límite del local y las marca como incidencia auditable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {autoClockOutQuery.isLoading ? (
              <p className="text-sm text-ink-muted">Cargando configuración...</p>
            ) : (
              <form onSubmit={handleSaveAutoClockOut} className="grid gap-4 md:grid-cols-[180px_180px_1fr_140px_auto] md:items-end">
                <label className="flex items-center gap-2 rounded-md border border-border bg-surface-bg px-3 py-2.5 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={autoEnabled}
                    disabled={!canWriteSettings}
                    onChange={(event) => setAutoDraft((current) => ({ ...current, enabled: event.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  Activado
                </label>
                <div className="space-y-1.5">
                  <Label htmlFor="auto-clock-out-time">Hora límite</Label>
                  <Input
                    id="auto-clock-out-time"
                    type="time"
                    value={autoTime}
                    disabled={!canWriteSettings}
                    onChange={(event) => setAutoDraft((current) => ({ ...current, time: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auto-clock-out-timezone">Zona horaria</Label>
                  <Input
                    id="auto-clock-out-timezone"
                    value={autoTimezone}
                    disabled={!canWriteSettings}
                    onChange={(event) => setAutoDraft((current) => ({ ...current, timezone: event.target.value }))}
                    placeholder={company?.timezone ?? "Europe/Madrid"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auto-clock-out-grace">Margen</Label>
                  <Input
                    id="auto-clock-out-grace"
                    type="number"
                    min={0}
                    max={180}
                    value={autoGrace}
                    disabled={!canWriteSettings}
                    onChange={(event) => setAutoDraft((current) => ({ ...current, grace: Number(event.target.value) || 0 }))}
                  />
                </div>
                <Button type="submit" loading={updateAutoClockOut.isPending} disabled={!canWriteSettings}>
                  Guardar
                </Button>
              </form>
            )}
            {autoClockOutQuery.data?.auto_clock_out_updated_at && (
              <p className="mt-3 text-[12px] text-ink-muted">
                Ultima actualizacion: {new Date(autoClockOutQuery.data.auto_clock_out_updated_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Miembros e invitaciones</CardTitle>
            <CardDescription>
              Gestiona accesos tenant para propietarios, administradores, managers y empleados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!canManageMembers && (
              <div className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning-DEFAULT">
                Tu rol puede consultar la configuración, pero no administrar miembros.
              </div>
            )}

            {canManageMembers && (
              <>
                <form onSubmit={handleInvite} className="grid gap-3 rounded-md border border-border bg-surface-bg p-4 md:grid-cols-[1fr_180px_auto] md:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="persona@empresa.com"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rol</Label>
                    <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" loading={createInvitation.isPending} disabled={roleOptions.length === 0}>
                    <MailPlus className="h-4 w-4" />
                    Invitar
                  </Button>
                </form>

                {lastInvitation && (
                  <div className="rounded-md border border-success-border bg-success-bg px-3.5 py-2.5 text-[13px] text-success-DEFAULT">
                    Invitación creada para {lastInvitation.email}. Enlace:{" "}
                    <span className="break-all font-semibold">{lastInvitation.acceptance_url}</span>
                  </div>
                )}

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-ink">Miembros actuales</h3>
                  </div>
                  {membersQuery.isLoading && <p className="text-sm text-ink-muted">Cargando miembros...</p>}
                  {membersQuery.error && <p className="text-sm text-danger-DEFAULT">No se pudieron cargar los miembros.</p>}
                  {membersQuery.data?.length === 0 && (
                    <p className="rounded-md border border-border bg-white p-4 text-sm text-ink-muted">
                      Todavía no hay miembros asociados a esta empresa.
                    </p>
                  )}
                  {membersQuery.data && membersQuery.data.length > 0 && (
                    <div className="overflow-hidden rounded-md border border-border">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-surface-bg text-[11px] uppercase tracking-wide text-ink-muted">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Persona</th>
                            <th className="px-3 py-2 font-semibold">Rol</th>
                            <th className="px-3 py-2 font-semibold">Estado</th>
                            <th className="px-3 py-2 text-right font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                          {membersQuery.data.map((member) => {
                            const isSelf = member.id === actor?.id;
                            const canEditMember = !isSelf && roleOptions.includes(member.role);
                            return (
                              <tr key={member.id}>
                                <td className="px-3 py-3">
                                  <div className="font-medium text-ink">{member.full_name}</div>
                                  <div className="text-xs text-ink-muted">{member.email}</div>
                                </td>
                                <td className="px-3 py-3">
                                  {canEditMember ? (
                                    <Select
                                      value={member.role}
                                      onValueChange={(value) => changeRole.mutate({ userId: member.id, role: value as UserRole })}
                                      disabled={changeRole.isPending}
                                    >
                                      <SelectTrigger className="w-[150px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {roleOptions.map((role) => (
                                          <SelectItem key={role} value={role}>
                                            {ROLE_LABELS[role]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    ROLE_LABELS[member.role]
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <Badge variant={member.is_active ? "success" : "muted"}>
                                    {member.is_active ? "Activo" : "Inactivo"}
                                  </Badge>
                                </td>
                                <td className="px-3 py-3 text-right">
                                  {canEditMember && member.is_active && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRevokeMember(member)}
                                      loading={revokeMember.isPending}
                                    >
                                      <UserMinus className="h-4 w-4" />
                                      Revocar
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink">Invitaciones</h3>
                  {invitationsQuery.isLoading && <p className="text-sm text-ink-muted">Cargando invitaciones...</p>}
                  {invitationsQuery.error && <p className="text-sm text-danger-DEFAULT">No se pudieron cargar las invitaciones.</p>}
                  {invitationsQuery.data?.length === 0 && (
                    <p className="rounded-md border border-border bg-white p-4 text-sm text-ink-muted">
                      No hay invitaciones pendientes o recientes.
                    </p>
                  )}
                  {invitationsQuery.data && invitationsQuery.data.length > 0 && (
                    <div className="divide-y divide-border rounded-md border border-border bg-white">
                      {invitationsQuery.data.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between gap-3 px-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{invitation.email}</p>
                            <p className="text-xs text-ink-muted">
                              {ROLE_LABELS[invitation.role]} · vence {new Date(invitation.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant={invitation.status === "pending" ? "warning" : "muted"}>
                              {INVITATION_STATUS_LABELS[invitation.status] ?? invitation.status}
                            </Badge>
                            {invitation.status === "pending" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeInvitation.mutate(invitation.id)}
                                loading={revokeInvitation.isPending}
                              >
                                Revocar
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan y suscripción</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="mb-1 text-[12px] font-medium text-ink-muted">Plan actual</dt>
                <dd className="text-[14px] font-semibold text-ink">{company?.plan_name ?? "-"}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[12px] font-medium text-ink-muted">Empleados incluidos</dt>
                <dd className="text-[14px] font-semibold text-ink">
                  {company?.max_employees ?? "Sin límite"}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[12px] font-medium text-ink-muted">Suscripción</dt>
                <dd className="text-[14px] font-semibold text-ink">
                  {company?.is_active_subscription ? "Activa" : "Inactiva"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <PlanCards currentPlan={company?.plan_type} compact />
      </div>
    </>
  );
}
