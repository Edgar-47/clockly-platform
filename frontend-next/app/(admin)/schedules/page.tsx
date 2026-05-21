"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  Coffee,
  Edit2,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";
import { useSchedules, useCreateSchedule, useUpdateSchedule } from "@/hooks/use-schedules";
import { Topbar } from "@/components/shared/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Schedule, ScheduleCreate } from "@/types/schedule";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type DayKey = typeof DAY_KEYS[number];

const DAY_LABELS: Record<DayKey, string> = {
  monday: "L",
  tuesday: "M",
  wednesday: "X",
  thursday: "J",
  friday: "V",
  saturday: "S",
  sunday: "D",
};

const DAY_FULL: Record<DayKey, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

function fmtTime(t: string) {
  return t.slice(0, 5); // "HH:MM:SS" → "HH:MM"
}

function activeDays(schedule: Schedule): DayKey[] {
  return DAY_KEYS.filter((d) => schedule[d]);
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const scheduleSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(120, "Máximo 120 caracteres"),
    description: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
    monday: z.boolean().default(false),
    tuesday: z.boolean().default(false),
    wednesday: z.boolean().default(false),
    thursday: z.boolean().default(false),
    friday: z.boolean().default(false),
    saturday: z.boolean().default(false),
    sunday: z.boolean().default(false),
    entry_time: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
    exit_time: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
    break_minutes: z.coerce.number().int().min(0).max(480).default(0),
  })
  .superRefine((v, ctx) => {
    const days = DAY_KEYS.map((d) => v[d]);
    if (!days.some(Boolean)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["monday"], message: "Selecciona al menos un día." });
    }
    const [eh, em] = v.entry_time.split(":").map(Number);
    const [xh, xm] = v.exit_time.split(":").map(Number);
    const entryMins = eh * 60 + em;
    const exitMins = xh * 60 + xm;
    if (exitMins <= entryMins) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["exit_time"], message: "La salida debe ser posterior a la entrada." });
    } else if (exitMins - entryMins <= v.break_minutes) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["break_minutes"], message: "El descanso no puede superar la duración del turno." });
    }
  });

type FormValues = z.infer<typeof scheduleSchema>;

// ─── Schedule form ────────────────────────────────────────────────────────────

interface ScheduleFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  error?: string | null;
}

function ScheduleForm({ defaultValues, onSubmit, onCancel, loading, error }: ScheduleFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      monday: false, tuesday: false, wednesday: false,
      thursday: false, friday: false, saturday: false, sunday: false,
      break_minutes: 0,
      ...defaultValues,
    },
  });

  const watchedDays = watch(DAY_KEYS as unknown as (keyof FormValues)[]);
  const noDaySelected = !watchedDays.some(Boolean);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div role="alert" className="rounded-xl border border-danger-border bg-danger-bg px-3.5 py-3 text-[12px] text-danger-DEFAULT">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-[13px] font-semibold text-ink">
          Nombre <span className="text-danger-DEFAULT">*</span>
        </Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Turno de mañana, Jornada completa…"
          className="h-10 rounded-xl"
        />
        {errors.name && <p className="text-[11px] text-danger-DEFAULT">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-[13px] font-semibold text-ink">
          Descripción
        </Label>
        <Input
          id="description"
          {...register("description")}
          placeholder="Descripción opcional del horario"
          className="h-10 rounded-xl"
        />
      </div>

      {/* Days */}
      <div className="space-y-2">
        <Label className="text-[13px] font-semibold text-ink">
          Días laborables <span className="text-danger-DEFAULT">*</span>
        </Label>
        <div className="flex gap-1.5 flex-wrap">
          {DAY_KEYS.map((day) => (
            <Controller
              key={day}
              name={day}
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    "h-9 w-9 rounded-lg text-[12px] font-bold transition-all border",
                    field.value
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface-bg text-ink-muted border-border hover:border-primary/50 hover:text-ink",
                  )}
                  title={DAY_FULL[day]}
                >
                  {DAY_LABELS[day]}
                </button>
              )}
            />
          ))}
        </div>
        {(errors.monday || noDaySelected) && (
          <p className="text-[11px] text-danger-DEFAULT">
            {errors.monday?.message ?? "Selecciona al menos un día."}
          </p>
        )}
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="entry_time" className="text-[13px] font-semibold text-ink">
            Entrada <span className="text-danger-DEFAULT">*</span>
          </Label>
          <Input id="entry_time" type="time" {...register("entry_time")} className="h-10 rounded-xl" />
          {errors.entry_time && <p className="text-[11px] text-danger-DEFAULT">{errors.entry_time.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exit_time" className="text-[13px] font-semibold text-ink">
            Salida <span className="text-danger-DEFAULT">*</span>
          </Label>
          <Input id="exit_time" type="time" {...register("exit_time")} className="h-10 rounded-xl" />
          {errors.exit_time && <p className="text-[11px] text-danger-DEFAULT">{errors.exit_time.message}</p>}
        </div>
      </div>

      {/* Break */}
      <div className="space-y-1.5">
        <Label htmlFor="break_minutes" className="text-[13px] font-semibold text-ink">
          Descanso
        </Label>
        <div className="relative max-w-[160px]">
          <Input
            id="break_minutes"
            type="number"
            min={0}
            max={480}
            {...register("break_minutes")}
            className="h-10 rounded-xl pr-14"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-muted">
            min
          </span>
        </div>
        {errors.break_minutes && <p className="text-[11px] text-danger-DEFAULT">{errors.break_minutes.message}</p>}
      </div>

      <DialogFooter className="gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="rounded-xl">
          Guardar horario
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Schedule card ────────────────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  onEdit,
  onToggle,
}: {
  schedule: Schedule;
  onEdit: (s: Schedule) => void;
  onToggle: (s: Schedule) => void;
}) {
  const days = activeDays(schedule);

  return (
    <div className={cn(
      "rounded-2xl border bg-white p-5 shadow-sm transition-all",
      schedule.is_active ? "border-border" : "border-border opacity-60",
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-bold text-ink truncate">{schedule.name}</h3>
            <Badge variant={schedule.is_active ? "success" : "muted"} className="text-[10px]">
              {schedule.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          {schedule.description && (
            <p className="mt-0.5 text-[12px] text-ink-muted">{schedule.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button" variant="ghost" size="sm"
            className="h-8 w-8 rounded-lg p-0"
            onClick={() => onEdit(schedule)}
            title="Editar"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button" variant="ghost" size="sm"
            className="h-8 w-8 rounded-lg p-0"
            onClick={() => onToggle(schedule)}
            title={schedule.is_active ? "Desactivar" : "Activar"}
          >
            {schedule.is_active
              ? <ToggleRight className="h-4 w-4 text-success-DEFAULT" />
              : <ToggleLeft className="h-4 w-4 text-ink-muted" />}
          </Button>
        </div>
      </div>

      {/* Day chips */}
      <div className="mt-3 flex gap-1 flex-wrap">
        {DAY_KEYS.map((d) => (
          <span
            key={d}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold",
              schedule[d]
                ? "bg-primary/10 text-primary"
                : "bg-surface-bg text-ink-xmuted",
            )}
          >
            {DAY_LABELS[d]}
          </span>
        ))}
      </div>

      {/* Stats chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-bg px-2.5 py-1 text-[11px] text-ink-muted">
          <Clock className="h-3 w-3 text-primary" />
          {fmtTime(schedule.entry_time)} – {fmtTime(schedule.exit_time)}
        </div>
        {schedule.break_minutes > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-bg px-2.5 py-1 text-[11px] text-ink-muted">
            <Coffee className="h-3 w-3 text-ink-muted" />
            {schedule.break_minutes} min descanso
          </div>
        )}
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-bg px-2.5 py-1 text-[11px] text-ink-muted">
          <CalendarDays className="h-3 w-3 text-primary" />
          {schedule.net_hours}h/día · {schedule.weekly_hours}h/sem
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-bg px-2.5 py-1 text-[11px] text-ink-muted">
          <Users className="h-3 w-3 text-primary" />
          {schedule.employee_count} {schedule.employee_count === 1 ? "empleado" : "empleados"}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const { data: schedules = [], isLoading } = useSchedules(true);
  const create = useCreateSchedule();
  const update = useUpdateSchedule();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const handleCreate = async (values: FormValues) => {
    setCreateError(null);
    try {
      const payload: ScheduleCreate = {
        ...values,
        entry_time: `${values.entry_time}:00`,
        exit_time: `${values.exit_time}:00`,
        description: values.description || undefined,
      };
      await create.mutateAsync(payload);
      toast.success("Horario creado.");
      setCreateOpen(false);
    } catch {
      const msg = "No se pudo crear el horario.";
      setCreateError(msg);
      toast.error(msg);
    }
  };

  const handleEdit = async (values: FormValues) => {
    if (!editTarget) return;
    setEditError(null);
    try {
      await update.mutateAsync({
        id: editTarget.id,
        payload: {
          ...values,
          entry_time: `${values.entry_time}:00`,
          exit_time: `${values.exit_time}:00`,
          description: values.description || undefined,
        },
      });
      toast.success("Horario actualizado.");
      setEditTarget(null);
    } catch {
      const msg = "No se pudo actualizar el horario.";
      setEditError(msg);
      toast.error(msg);
    }
  };

  const handleToggle = (schedule: Schedule) => {
    update.mutate(
      { id: schedule.id, payload: { is_active: !schedule.is_active } },
      {
        onSuccess: () =>
          toast.success(schedule.is_active ? "Horario desactivado." : "Horario activado."),
        onError: () => toast.error("No se pudo cambiar el estado del horario."),
      },
    );
  };

  // Split active and inactive
  const active = schedules.filter((s) => s.is_active);
  const inactive = schedules.filter((s) => !s.is_active);

  return (
    <>
      <Topbar
        title="Horarios"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Nuevo horario
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-3xl space-y-8 p-4 sm:p-6">
        {/* Page header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold text-ink">Horarios de trabajo</h2>
            <p className="mt-0.5 text-[12px] text-ink-xmuted">
              Define los turnos de tu empresa y asígnalos a cada empleado para controlar retrasos y horas semanales.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-surface-bg border border-border" />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-bg py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-xmuted/10 mb-3">
              <CalendarDays className="h-6 w-6 text-ink-xmuted" />
            </div>
            <p className="text-[13px] font-medium text-ink-muted">No hay horarios configurados.</p>
            <p className="mt-1 text-[12px] text-ink-xmuted">
              Crea un horario para empezar a controlar entradas y calcular horas.
            </p>
            <Button
              size="sm" variant="outline" className="mt-4 rounded-xl"
              onClick={() => { setCreateError(null); setCreateOpen(true); }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Crear primer horario
            </Button>
          </div>
        ) : (
          <>
            {/* Active schedules */}
            {active.length > 0 && (
              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-xmuted">
                  Activos · {active.length}
                </p>
                {active.map((s) => (
                  <ScheduleCard key={s.id} schedule={s} onEdit={setEditTarget} onToggle={handleToggle} />
                ))}
              </section>
            )}

            {/* Inactive schedules */}
            {inactive.length > 0 && (
              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-xmuted">
                  Inactivos · {inactive.length}
                </p>
                {inactive.map((s) => (
                  <ScheduleCard key={s.id} schedule={s} onEdit={setEditTarget} onToggle={handleToggle} />
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (o) setCreateError(null); }}>
        <DialogContent className="flex max-h-[90vh] w-[92vw] max-w-md flex-col overflow-hidden rounded-2xl p-0 sm:w-full">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="text-[16px]">Nuevo horario</DialogTitle>
            <DialogDescription className="sr-only">
              Configura los días, la hora de entrada y salida y el tiempo de descanso.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-5">
            <ScheduleForm
              onSubmit={handleCreate}
              onCancel={() => { setCreateOpen(false); setCreateError(null); }}
              loading={create.isPending}
              error={createError}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); setEditError(null); }}>
        <DialogContent className="flex max-h-[90vh] w-[92vw] max-w-md flex-col overflow-hidden rounded-2xl p-0 sm:w-full">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="text-[16px]">Editar horario</DialogTitle>
            <DialogDescription className="sr-only">
              Modifica el nombre, días, horas y descanso del horario.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="overflow-y-auto px-6 py-5">
              <ScheduleForm
                defaultValues={{
                  name: editTarget.name,
                  description: editTarget.description ?? "",
                  monday: editTarget.monday,
                  tuesday: editTarget.tuesday,
                  wednesday: editTarget.wednesday,
                  thursday: editTarget.thursday,
                  friday: editTarget.friday,
                  saturday: editTarget.saturday,
                  sunday: editTarget.sunday,
                  entry_time: fmtTime(editTarget.entry_time),
                  exit_time: fmtTime(editTarget.exit_time),
                  break_minutes: editTarget.break_minutes,
                }}
                onSubmit={handleEdit}
                onCancel={() => { setEditTarget(null); setEditError(null); }}
                loading={update.isPending}
                error={editError}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

