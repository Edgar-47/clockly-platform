"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CalendarClock,
  Clock,
  Edit2,
  MoreVertical,
  PlusCircle,
  Trash2,
  Users,
} from "lucide-react";
import { useEmployees } from "@/hooks/use-employees";
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useAssignEmployeeSchedule,
} from "@/hooks/use-schedules";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Schedule, ScheduleType } from "@/types/schedule";
import type { Employee } from "@/types/employee";
import {
  SCHEDULE_TYPE_LABELS,
  SCHEDULE_TYPE_DESCRIPTIONS,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
} from "@/types/schedule";

// ── Zod schemas ─────────────────────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const optionalTime = z
  .string()
  .regex(timeRegex, "Hora inválida (HH:MM)")
  .optional()
  .or(z.literal(""))
  .nullable()
  .transform((v) => v || null);

const scheduleRuleSchema = z.object({
  weekday: z.number().min(0).max(6),
  is_working_day: z.boolean(),
  start_time: optionalTime,
  end_time: optionalTime,
  entry_window_start: optionalTime,
  entry_window_end: optionalTime,
  exit_window_start: optionalTime,
  exit_window_end: optionalTime,
  grace_minutes: z.coerce.number().min(0).max(120).optional().nullable(),
});

const scheduleFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio").max(120),
    schedule_type: z.enum(["none", "fixed", "weekly_custom", "flexible_window"]),
    grace_minutes: z.coerce.number().min(0).max(120).optional().nullable(),
    monday: z.boolean().default(false),
    tuesday: z.boolean().default(false),
    wednesday: z.boolean().default(false),
    thursday: z.boolean().default(false),
    friday: z.boolean().default(false),
    saturday: z.boolean().default(false),
    sunday: z.boolean().default(false),
    entry_time: optionalTime,
    exit_time: optionalTime,
    break_minutes: z.coerce.number().min(0).max(480).default(0),
    entry_window_start: optionalTime,
    entry_window_end: optionalTime,
    exit_window_start: optionalTime,
    exit_window_end: optionalTime,
    rules: z.array(scheduleRuleSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.schedule_type === "fixed") {
      const days = [data.monday, data.tuesday, data.wednesday, data.thursday, data.friday, data.saturday, data.sunday];
      if (!days.some(Boolean)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona al menos un día", path: ["monday"] });
      }
      if (!data.entry_time) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["entry_time"] });
      if (!data.exit_time) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["exit_time"] });
    }
    if (data.schedule_type === "flexible_window") {
      if (!data.entry_window_start) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["entry_window_start"] });
      if (!data.entry_window_end) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["entry_window_end"] });
    }
    if (data.schedule_type === "weekly_custom") {
      const working = data.rules.filter((r) => r.is_working_day);
      if (!working.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Define al menos un día laborable", path: ["rules"] });
      }
    }
  });

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

const DAYS_OF_WEEK = [
  { key: "monday" as const, label: "Lunes", short: "L" },
  { key: "tuesday" as const, label: "Martes", short: "M" },
  { key: "wednesday" as const, label: "Miércoles", short: "X" },
  { key: "thursday" as const, label: "Jueves", short: "J" },
  { key: "friday" as const, label: "Viernes", short: "V" },
  { key: "saturday" as const, label: "Sábado", short: "S" },
  { key: "sunday" as const, label: "Domingo", short: "D" },
];

// ── Schedule Form ─────────────────────────────────────────────────────────────

function ScheduleForm({
  defaultValues,
  onSubmit,
  onCancel,
  loading,
}: {
  defaultValues?: Partial<ScheduleFormValues>;
  onSubmit: (v: ScheduleFormValues) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      schedule_type: "fixed",
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
      break_minutes: 0,
      rules: DAYS_OF_WEEK.map((_, i) => ({
        weekday: i,
        is_working_day: i < 5,
        start_time: "09:00" as string | null,
        end_time: "17:00" as string | null,
        entry_window_start: null as string | null,
        entry_window_end: null as string | null,
        exit_window_start: null as string | null,
        exit_window_end: null as string | null,
        grace_minutes: null as number | null | undefined,
      })),
      ...defaultValues,
    },
  });

  const { fields } = useFieldArray({ control, name: "rules" });
  const scheduleType = watch("schedule_type");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label className="text-[13px] font-semibold text-ink">
          Nombre del horario <span className="text-danger-DEFAULT">*</span>
        </Label>
        <Input
          {...register("name")}
          placeholder="Turno de mañana, Oficina L-V…"
          className="h-10 rounded-xl border-border bg-surface-bg px-3.5 text-[13px] focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        {errors.name && <p className="text-[11px] text-danger-DEFAULT">{errors.name.message}</p>}
      </div>

      {/* Type selector */}
      <div className="space-y-1.5">
        <Label className="text-[13px] font-semibold text-ink">
          Tipo de horario <span className="text-danger-DEFAULT">*</span>
        </Label>
        <Controller
          control={control}
          name="schedule_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-10 rounded-xl border-border bg-surface-bg text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["none", "fixed", "weekly_custom", "flexible_window"] as ScheduleType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="font-medium">{SCHEDULE_TYPE_LABELS[t]}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-[11px] text-ink-xmuted">{SCHEDULE_TYPE_DESCRIPTIONS[scheduleType as ScheduleType]}</p>
      </div>

      {/* NONE */}
      {scheduleType === "none" && (
        <div className="rounded-xl border border-border bg-surface-bg px-4 py-3 text-[12px] text-ink-muted">
          Los empleados con este horario{" "}
          <strong className="text-ink">no generarán retrasos automáticos</strong>. Podrán fichar normalmente.
        </div>
      )}

      {/* FIXED — day picker + times */}
      {scheduleType === "fixed" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-ink">Días laborables</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const val = watch(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setValue(d.key, !val)}
                    className={`h-9 w-9 rounded-lg text-[12px] font-bold transition-colors ${
                      val
                        ? "bg-primary text-white"
                        : "border border-border bg-surface-bg text-ink-muted hover:bg-surface-bg/80"
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
            {errors.monday && <p className="text-[11px] text-danger-DEFAULT">{errors.monday.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-ink">Entrada</Label>
              <Input type="time" {...register("entry_time")} className="h-10 rounded-xl border-border bg-surface-bg text-[13px]" />
              {errors.entry_time && <p className="text-[11px] text-danger-DEFAULT">{String(errors.entry_time.message)}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-ink">Salida</Label>
              <Input type="time" {...register("exit_time")} className="h-10 rounded-xl border-border bg-surface-bg text-[13px]" />
              {errors.exit_time && <p className="text-[11px] text-danger-DEFAULT">{String(errors.exit_time.message)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* FLEXIBLE_WINDOW */}
      {scheduleType === "flexible_window" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-ink">Días activos</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const val = watch(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setValue(d.key, !val)}
                    className={`h-9 w-9 rounded-lg text-[12px] font-bold transition-colors ${
                      val
                        ? "bg-primary text-white"
                        : "border border-border bg-surface-bg text-ink-muted hover:bg-surface-bg/80"
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface-bg p-4 space-y-3">
            <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wide">Ventana de entrada</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-muted">Desde</Label>
                <Input type="time" {...register("entry_window_start")} className="h-9 rounded-lg border-border bg-white text-[13px]" />
                {errors.entry_window_start && <p className="text-[11px] text-danger-DEFAULT">{String(errors.entry_window_start.message)}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-muted">Hasta</Label>
                <Input type="time" {...register("entry_window_end")} className="h-9 rounded-lg border-border bg-white text-[13px]" />
                {errors.entry_window_end && <p className="text-[11px] text-danger-DEFAULT">{String(errors.entry_window_end.message)}</p>}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface-bg p-4 space-y-3">
            <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-wide">Ventana de salida (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-muted">Desde</Label>
                <Input type="time" {...register("exit_window_start")} className="h-9 rounded-lg border-border bg-white text-[13px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-muted">Hasta</Label>
                <Input type="time" {...register("exit_window_end")} className="h-9 rounded-lg border-border bg-white text-[13px]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY_CUSTOM */}
      {scheduleType === "weekly_custom" && (
        <div className="space-y-3">
          <Label className="text-[13px] font-semibold text-ink">Horario por día</Label>
          {errors.rules && !Array.isArray(errors.rules) && (
            <p className="text-[11px] text-danger-DEFAULT">{(errors.rules as { message?: string }).message}</p>
          )}
          <div className="space-y-2">
            {fields.map((field, i) => {
              const isWorking = watch(`rules.${i}.is_working_day`);
              return (
                <div
                  key={field.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    isWorking ? "border-border bg-white" : "border-border/50 bg-surface-bg"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setValue(`rules.${i}.is_working_day`, !isWorking)}
                      className={`h-7 w-7 shrink-0 rounded-lg text-[11px] font-bold transition-colors ${
                        isWorking ? "bg-primary text-white" : "bg-ink-xmuted/10 text-ink-muted"
                      }`}
                    >
                      {WEEKDAY_SHORT[i]}
                    </button>
                    <span className="hidden sm:block w-20 text-[12px] font-medium text-ink shrink-0">
                      {WEEKDAY_LABELS[i]}
                    </span>
                    {isWorking ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          type="time"
                          {...register(`rules.${i}.start_time`)}
                          className="h-8 flex-1 min-w-0 rounded-lg border-border bg-surface-bg text-[12px]"
                        />
                        <span className="text-[11px] text-ink-muted shrink-0">–</span>
                        <Input
                          type="time"
                          {...register(`rules.${i}.end_time`)}
                          className="h-8 flex-1 min-w-0 rounded-lg border-border bg-surface-bg text-[12px]"
                        />
                      </div>
                    ) : (
                      <span className="flex-1 text-[12px] text-ink-muted">Descanso</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grace minutes */}
      {scheduleType !== "none" && (
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold text-ink">Tolerancia de retraso</Label>
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={120}
              {...register("grace_minutes")}
              placeholder="0"
              className="h-10 rounded-xl border-border bg-surface-bg pl-3.5 pr-16 text-[13px] focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-ink-muted">
              min
            </span>
          </div>
          <p className="text-[11px] text-ink-xmuted">
            Vacío = usa la tolerancia configurada en Configuración de empresa.
          </p>
        </div>
      )}

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

// ── Schedule summary line ─────────────────────────────────────────────────────

function ScheduleSummaryLine({ schedule }: { schedule: Schedule }) {
  const t = schedule.schedule_type;
  if (t === "none") return <>Sin horario — no se calcularán retrasos</>;
  if (t === "fixed") {
    const days = DAYS_OF_WEEK.filter((d) => schedule[d.key as keyof Schedule]).map((d) => d.short);
    return (
      <>
        {days.join(" ")} · {schedule.entry_time?.slice(0, 5)} – {schedule.exit_time?.slice(0, 5)}
        {schedule.grace_minutes ? ` · tolerancia ${schedule.grace_minutes} min` : ""}
      </>
    );
  }
  if (t === "weekly_custom") {
    const workDays = schedule.rules.filter((r) => r.is_working_day).length;
    return <>{workDays} días personalizados</>;
  }
  if (t === "flexible_window") {
    return (
      <>
        Entrada {schedule.entry_window_start?.slice(0, 5)} – {schedule.entry_window_end?.slice(0, 5)}
        {schedule.exit_window_end ? ` · Salida hasta ${schedule.exit_window_end.slice(0, 5)}` : ""}
      </>
    );
  }
  return null;
}

// ── Assign Schedule Modal ─────────────────────────────────────────────────────

function AssignScheduleModal({
  employee,
  currentScheduleId,
  schedules,
  onAssign,
  onClose,
  loading,
}: {
  employee: Employee;
  currentScheduleId: string | null;
  schedules: Schedule[];
  onAssign: (scheduleId: string | null) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(currentScheduleId);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[92vw] max-w-md flex-col overflow-hidden rounded-2xl p-0 sm:w-full">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-[15px]">
            Asignar horario — {employee.first_name} {employee.last_name}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-5 space-y-2">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
              selected === null ? "border-primary bg-primary/5" : "border-border bg-surface-bg hover:border-primary/30"
            }`}
          >
            <p className="text-[13px] font-semibold text-ink">Sin horario</p>
            <p className="text-[11px] text-ink-muted mt-0.5">No se generarán retrasos automáticos</p>
          </button>
          {schedules.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s.id)}
              className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                selected === s.id ? "border-primary bg-primary/5" : "border-border bg-surface-bg hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[13px] font-semibold text-ink">{s.name}</p>
                <Badge variant="default" className="text-[10px] shrink-0">
                  {SCHEDULE_TYPE_LABELS[s.schedule_type]}
                </Badge>
              </div>
              <p className="text-[11px] text-ink-muted mt-1">
                <ScheduleSummaryLine schedule={s} />
              </p>
            </button>
          ))}
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={() => onAssign(selected)} loading={loading} className="rounded-xl">
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Schedule Card ─────────────────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
}: {
  schedule: Schedule;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="rounded-2xl border-border px-4 py-3.5 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-bold text-ink">{schedule.name}</p>
            <Badge variant={schedule.is_active ? "default" : "muted"} className="text-[10px]">
              {SCHEDULE_TYPE_LABELS[schedule.schedule_type]}
            </Badge>
            {!schedule.is_active && (
              <Badge variant="muted" className="text-[10px]">Inactivo</Badge>
            )}
          </div>
          <p className="mt-1 text-[12px] text-ink-muted">
            <ScheduleSummaryLine schedule={schedule} />
          </p>
          {schedule.employee_count > 0 && (
            <p className="mt-1 text-[11px] text-ink-xmuted">
              {schedule.employee_count} empleado{schedule.employee_count !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {/* Desktop */}
        <div className="hidden items-center gap-1 sm:flex shrink-0">
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-lg p-0 text-danger-DEFAULT hover:bg-danger-bg"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {/* Mobile */}
        <div className="sm:hidden shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                Desactivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCreatePayload(values: ScheduleFormValues) {
  const base = {
    name: values.name,
    schedule_type: values.schedule_type,
    grace_minutes: values.grace_minutes ?? null,
    is_active: true,
  };
  if (values.schedule_type === "none") return base;
  if (values.schedule_type === "fixed") {
    return {
      ...base,
      monday: values.monday,
      tuesday: values.tuesday,
      wednesday: values.wednesday,
      thursday: values.thursday,
      friday: values.friday,
      saturday: values.saturday,
      sunday: values.sunday,
      entry_time: values.entry_time ?? null,
      exit_time: values.exit_time ?? null,
      break_minutes: values.break_minutes,
    };
  }
  if (values.schedule_type === "flexible_window") {
    return {
      ...base,
      monday: values.monday,
      tuesday: values.tuesday,
      wednesday: values.wednesday,
      thursday: values.thursday,
      friday: values.friday,
      saturday: values.saturday,
      sunday: values.sunday,
      entry_window_start: values.entry_window_start ?? null,
      entry_window_end: values.entry_window_end ?? null,
      exit_window_start: values.exit_window_start ?? null,
      exit_window_end: values.exit_window_end ?? null,
    };
  }
  if (values.schedule_type === "weekly_custom") {
    return {
      ...base,
      rules: values.rules.map((r) => ({
        weekday: r.weekday,
        is_working_day: r.is_working_day,
        start_time: r.is_working_day ? (r.start_time ?? null) : null,
        end_time: r.is_working_day ? (r.end_time ?? null) : null,
        grace_minutes: r.grace_minutes ?? null,
      })),
    };
  }
  return base;
}

function scheduleToFormValues(s: Schedule): Partial<ScheduleFormValues> {
  return {
    name: s.name,
    schedule_type: s.schedule_type,
    grace_minutes: s.grace_minutes ?? undefined,
    monday: s.monday,
    tuesday: s.tuesday,
    wednesday: s.wednesday,
    thursday: s.thursday,
    friday: s.friday,
    saturday: s.saturday,
    sunday: s.sunday,
    entry_time: s.entry_time?.slice(0, 5) ?? undefined,
    exit_time: s.exit_time?.slice(0, 5) ?? undefined,
    break_minutes: s.break_minutes,
    entry_window_start: s.entry_window_start?.slice(0, 5) ?? undefined,
    entry_window_end: s.entry_window_end?.slice(0, 5) ?? undefined,
    exit_window_start: s.exit_window_start?.slice(0, 5) ?? undefined,
    exit_window_end: s.exit_window_end?.slice(0, 5) ?? undefined,
    rules:
      s.rules.length > 0
        ? s.rules.map((r) => ({
            weekday: r.weekday,
            is_working_day: r.is_working_day,
            start_time: r.start_time?.slice(0, 5) ?? null,
            end_time: r.end_time?.slice(0, 5) ?? null,
            entry_window_start: r.entry_window_start?.slice(0, 5) ?? null,
            entry_window_end: r.entry_window_end?.slice(0, 5) ?? null,
            exit_window_start: r.exit_window_start?.slice(0, 5) ?? null,
            exit_window_end: r.exit_window_end?.slice(0, 5) ?? null,
            grace_minutes: r.grace_minutes ?? null,
          }))
        : DAYS_OF_WEEK.map((_, i) => ({
            weekday: i,
            is_working_day: i < 5,
            start_time: "09:00" as string | null,
            end_time: "17:00" as string | null,
            entry_window_start: null as string | null,
            entry_window_end: null as string | null,
            exit_window_start: null as string | null,
            exit_window_end: null as string | null,
            grace_minutes: null as number | null | undefined,
          })),
  };
}

// ── Main page ─────────────────────────────────────────────────────────────────

type AssignTarget = { employee: Employee; currentScheduleId: string | null };

export default function SchedulesPage() {
  const { data: employees = [], isLoading: empLoading } = useEmployees();
  const { data: schedules = [], isLoading: schedLoading } = useSchedules(true);
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const assignSchedule = useAssignEmployeeSchedule();

  const scheduleMap = new Map(schedules.map((s) => [s.id, s]));

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [employeeScheduleMap, setEmployeeScheduleMap] = useState<Map<string, string | null>>(new Map());

  const activeSchedules = schedules.filter((s) => s.is_active);
  const activeEmployees = employees.filter((e) => e.is_active);
  const isLoading = empLoading || schedLoading;

  const handleCreate = async (values: ScheduleFormValues) => {
    try {
      await createSchedule.mutateAsync(buildCreatePayload(values));
      toast.success("Horario creado.");
      setCreateOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear el horario.");
    }
  };

  const handleUpdate = async (values: ScheduleFormValues) => {
    if (!editTarget) return;
    try {
      await updateSchedule.mutateAsync({ id: editTarget.id, payload: buildCreatePayload(values) });
      toast.success("Horario actualizado.");
      setEditTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar el horario.");
    }
  };

  const handleDelete = (s: Schedule) => {
    if (!confirm(`¿Desactivar el horario "${s.name}"?`)) return;
    deleteSchedule.mutate(s.id, {
      onSuccess: () => toast.success("Horario desactivado."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Error al desactivar."),
    });
  };

  const handleAssign = async (scheduleId: string | null) => {
    if (!assignTarget) return;
    try {
      await assignSchedule.mutateAsync({ employeeId: assignTarget.employee.id, scheduleId });
      setEmployeeScheduleMap((prev) => new Map(prev).set(assignTarget.employee.id, scheduleId));
      toast.success("Horario asignado correctamente.");
      setAssignTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al asignar el horario.");
    }
  };

  const getEmployeeSchedule = (emp: Employee): Schedule | null => {
    const id = employeeScheduleMap.get(emp.id);
    if (id === undefined || id === null) return null;
    return scheduleMap.get(id) ?? null;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[16px] font-bold text-ink">Horarios</h1>
            <p className="mt-0.5 text-[12px] text-ink-xmuted">
              Gestiona turnos y detecta llegadas tarde automáticamente.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full rounded-xl sm:w-auto">
          <PlusCircle className="h-3.5 w-3.5" />
          Nuevo horario
        </Button>
      </div>

      {/* Schedules catalog */}
      <section className="space-y-3">
        <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-ink-xmuted">
          Horarios disponibles
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-surface-bg" />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-bg py-12 text-center">
            <Clock className="mb-3 h-8 w-8 text-ink-xmuted/40" />
            <p className="text-[13px] font-medium text-ink-muted">No hay horarios definidos.</p>
            <p className="mt-1 text-[12px] text-ink-xmuted">
              Crea un horario para poder asignarlo a tus empleados.
            </p>
            <Button size="sm" variant="outline" className="mt-4 rounded-xl" onClick={() => setCreateOpen(true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              Crear primer horario
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <ScheduleCard
                key={s.id}
                schedule={s}
                onEdit={() => setEditTarget(s)}
                onDelete={() => handleDelete(s)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Employee assignments */}
      <section className="space-y-3">
        <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-ink-xmuted">
          Asignación por empleado
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-surface-bg" />
            ))}
          </div>
        ) : activeEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-bg py-10 text-center">
            <Users className="mb-3 h-8 w-8 text-ink-xmuted/40" />
            <p className="text-[13px] font-medium text-ink-muted">No hay empleados activos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeEmployees.map((emp) => {
              const schedule = getEmployeeSchedule(emp);
              return (
                <Card key={emp.id} className="rounded-2xl border-border px-4 py-3 shadow-none">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[12px] font-bold text-primary">
                        {emp.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">
                          {emp.first_name} {emp.last_name}
                        </p>
                        {schedule ? (
                          <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                            <span className="font-medium">{SCHEDULE_TYPE_LABELS[schedule.schedule_type]}</span>
                            {" · "}
                            <ScheduleSummaryLine schedule={schedule} />
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[11px] text-ink-xmuted">Sin horario asignado</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 rounded-xl px-3 text-[12px]"
                      onClick={() =>
                        setAssignTarget({
                          employee: emp,
                          currentScheduleId: employeeScheduleMap.get(emp.id) ?? null,
                        })
                      }
                    >
                      {schedule ? "Cambiar" : "Asignar"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="flex max-h-[90vh] w-[92vw] max-w-lg flex-col overflow-hidden rounded-2xl p-0 sm:w-full">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="text-[16px]">Nuevo horario</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-5">
            <ScheduleForm
              onSubmit={handleCreate}
              onCancel={() => setCreateOpen(false)}
              loading={createSchedule.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editTarget && (
        <Dialog open onOpenChange={(o) => !o && setEditTarget(null)}>
          <DialogContent className="flex max-h-[90vh] w-[92vw] max-w-lg flex-col overflow-hidden rounded-2xl p-0 sm:w-full">
            <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
              <DialogTitle className="text-[16px]">Editar horario</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto px-6 py-5">
              <ScheduleForm
                defaultValues={scheduleToFormValues(editTarget)}
                onSubmit={handleUpdate}
                onCancel={() => setEditTarget(null)}
                loading={updateSchedule.isPending}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Assign modal */}
      {assignTarget && (
        <AssignScheduleModal
          employee={assignTarget.employee}
          currentScheduleId={assignTarget.currentScheduleId}
          schedules={activeSchedules}
          onAssign={handleAssign}
          onClose={() => setAssignTarget(null)}
          loading={assignSchedule.isPending}
        />
      )}
    </div>
  );
}
