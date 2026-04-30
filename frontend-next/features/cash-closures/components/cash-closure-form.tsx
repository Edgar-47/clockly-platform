"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calculator, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrefillCashClosure } from "@/hooks/use-cash-closures";
import type {
  CashClosure,
  CashClosureCreateRequest,
  CashClosureLineInput,
  CashClosureShift,
} from "@/types/cash-closure";
import { CASH_CLOSURE_SHIFT_LABELS } from "@/types/cash-closure";
import type { WorkLocation } from "@/types/location";

type LineState = CashClosureLineInput & { key: string };

const today = new Date().toISOString().slice(0, 10);

function newLine(name: string): LineState {
  return {
    key: crypto.randomUUID(),
    name,
    amount: "0.00",
  };
}

function toLineState(lines: CashClosureLineInput[], fallback: string): LineState[] {
  if (lines.length === 0) return [newLine(fallback)];
  return lines.map((line) => ({
    ...line,
    amount: line.amount ?? line.real_amount ?? "0.00",
    key: crypto.randomUUID(),
  }));
}

function amount(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function normalizeAmount(value: string): string {
  return amount(value).toFixed(2);
}

function shiftDisplay(shift: CashClosureShift, custom?: string | null): string {
  return shift === "custom" ? custom || "Personalizado" : CASH_CLOSURE_SHIFT_LABELS[shift];
}

function buildState(initial?: CashClosure) {
  return {
    date: initial?.date ?? today,
    shift: initial?.shift ?? ("morning" as CashClosureShift),
    customShiftName: initial?.custom_shift_name ?? "",
    locationId: initial?.location_id ?? "none",
    theoreticalTotal: initial?.theoretical_total ?? "0.00",
    realTotal: initial?.real_total ?? "0.00",
    notes: initial?.notes ?? "",
    incidenceComment: initial?.incidence_comment ?? "",
    cashDrawers: toLineState(initial?.cash_drawers ?? [newLine("Cajon 1")], "Cajon 1"),
    cardTerminals: toLineState(initial?.card_terminals ?? [newLine("TPV 1")], "TPV 1"),
  };
}

function LineEditor({
  title,
  lines,
  fallbackName,
  onChange,
}: {
  title: string;
  lines: LineState[];
  fallbackName: string;
  onChange: (lines: LineState[]) => void;
}) {
  function update(index: number, patch: Partial<LineState>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function remove(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  return (
    <section className="rounded-lg border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onChange([...lines, newLine(`${fallbackName} ${lines.length + 1}`)])}
        >
          <Plus className="h-3.5 w-3.5" />
          Anadir
        </Button>
      </div>
      <div className="divide-y divide-border">
        {lines.map((line, index) => (
          <div key={line.key} className="grid gap-2 px-4 py-3 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Nombre</Label>
              <Input
                value={line.name}
                placeholder={fallbackName}
                onChange={(event) => update(index, { name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Importe</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.amount}
                onChange={(event) => update(index, { amount: event.target.value })}
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              title="Eliminar linea"
              aria-label="Eliminar linea"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CashClosureForm({
  initialClosure,
  locations,
  currentUserName,
  loading,
  submitLabel = "Cerrar caja",
  onSubmit,
}: {
  initialClosure?: CashClosure | null;
  locations: WorkLocation[];
  currentUserName: string;
  loading?: boolean;
  submitLabel?: string;
  onSubmit: (payload: CashClosureCreateRequest) => void;
}) {
  const [state, setState] = useState(buildState(initialClosure ?? undefined));
  const prefill = usePrefillCashClosure();

  useEffect(() => {
    setState(buildState(initialClosure ?? undefined));
  }, [initialClosure?.id]);

  const totals = useMemo(() => {
    const cashReal = state.cashDrawers.reduce((sum, line) => sum + amount(line.amount), 0);
    const cardReal = state.cardTerminals.reduce((sum, line) => sum + amount(line.amount), 0);
    const theoretical = amount(state.theoreticalTotal);
    const real = amount(state.realTotal);
    return {
      cashReal,
      cardReal,
      detailTotal: cashReal + cardReal,
      theoretical,
      real,
      balance: real - theoretical,
    };
  }, [state.cashDrawers, state.cardTerminals, state.realTotal, state.theoreticalTotal]);

  const hasLines = state.cashDrawers.length + state.cardTerminals.length > 0;
  const linesValid = [...state.cashDrawers, ...state.cardTerminals].every((line) => line.name.trim());
  const needsIncident = Math.abs(totals.balance) >= 0.005;
  const canSubmit =
    Boolean(state.date) &&
    Boolean(state.theoreticalTotal) &&
    Boolean(state.realTotal) &&
    linesValid &&
    hasLines &&
    (state.shift !== "custom" || Boolean(state.customShiftName.trim())) &&
    (!needsIncident || Boolean(state.incidenceComment.trim()));

  function applyPrefill() {
    prefill.mutate(
      {
        date: state.date,
        shift: state.shift,
        location_id: state.locationId === "none" ? undefined : state.locationId,
      },
      {
        onSuccess: (data) => {
          setState((current) => ({
            ...current,
            date: data.date,
            shift: data.shift,
            locationId: data.location_id ?? "none",
            theoreticalTotal: normalizeAmount(data.theoretical_total ?? "0"),
            realTotal: normalizeAmount(data.real_total ?? "0"),
            cashDrawers: toLineState(data.cash_drawers, "Cajon 1"),
            cardTerminals: toLineState(data.card_terminals, "TPV 1"),
          }));
          toast.success("Importe teorico preparado.");
        },
        onError: (err) => toast.error((err as Error).message ?? "No se pudo autocompletar."),
      },
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      date: state.date,
      shift: state.shift,
      custom_shift_name: state.shift === "custom" ? state.customShiftName.trim() : null,
      location_id: state.locationId === "none" ? null : state.locationId,
      theoretical_total: normalizeAmount(state.theoreticalTotal),
      real_total: normalizeAmount(state.realTotal),
      notes: state.notes.trim() || null,
      incidence_comment: state.incidenceComment.trim() || null,
      cash_drawers: state.cashDrawers.map((line) => ({
        name: line.name.trim(),
        amount: normalizeAmount(line.amount),
      })),
      card_terminals: state.cardTerminals.map((line) => ({
        name: line.name.trim(),
        amount: normalizeAmount(line.amount),
      })),
    });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <section className="rounded-lg border border-border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Fecha</Label>
            <Input
              type="date"
              value={state.date}
              onChange={(event) => setState((current) => ({ ...current, date: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Turno</Label>
            <Select
              value={state.shift}
              onValueChange={(value) =>
                setState((current) => ({ ...current, shift: value as CashClosureShift }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CASH_CLOSURE_SHIFT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Local</Label>
            <Select
              value={state.locationId}
              onValueChange={(value) => setState((current) => ({ ...current, locationId: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin local</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Cierra</Label>
            <div className="flex h-9 items-center rounded border border-border-strong bg-surface-muted px-3 text-sm text-ink">
              {initialClosure?.signature_name ?? currentUserName}
            </div>
          </div>
        </div>

        {state.shift === "custom" && (
          <div className="mt-3 max-w-sm space-y-1.5">
            <Label className="text-[12px]">Nombre del turno</Label>
            <Input
              value={state.customShiftName}
              placeholder="Evento, cierre partido, refuerzo..."
              onChange={(event) => setState((current) => ({ ...current, customShiftName: event.target.value }))}
            />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Total teorico</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={state.theoreticalTotal}
              onChange={(event) =>
                setState((current) => ({ ...current, theoreticalTotal: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Total real</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={state.realTotal}
              onChange={(event) => setState((current) => ({ ...current, realTotal: event.target.value }))}
            />
          </div>
          <div className={needsIncident ? "rounded-md bg-danger-bg p-3 text-danger-DEFAULT" : "rounded-md bg-success-bg p-3 text-success-DEFAULT"}>
            <p className="text-[11px] font-medium uppercase">Balance</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{money(totals.balance)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <LineEditor
          title="Cajones de efectivo"
          lines={state.cashDrawers}
          fallbackName="Cajon"
          onChange={(cashDrawers) => setState((current) => ({ ...current, cashDrawers }))}
        />
        <LineEditor
          title="Datafonos"
          lines={state.cardTerminals}
          fallbackName="TPV"
          onChange={(cardTerminals) => setState((current) => ({ ...current, cardTerminals }))}
        />
      </div>

      <section className="rounded-lg border border-border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-[11px] font-medium uppercase text-ink-muted">Efectivo</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{money(totals.cashReal)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase text-ink-muted">Tarjeta</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{money(totals.cardReal)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase text-ink-muted">Desglose</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{money(totals.detailTotal)}</p>
          </div>
          <div className={needsIncident ? "text-danger-DEFAULT" : "text-success-DEFAULT"}>
            <p className="text-[11px] font-medium uppercase">Balance</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{money(totals.balance)}</p>
          </div>
        </div>
      </section>

      {needsIncident ? (
        <section className="rounded-lg border border-danger-border bg-danger-bg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-DEFAULT" />
            <div className="flex-1 space-y-2">
              <p className="text-[13px] font-semibold text-danger-DEFAULT">El cierre no cuadra</p>
              <textarea
                className="min-h-[76px] w-full resize-none rounded border border-danger-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-danger-DEFAULT focus:ring-2 focus:ring-danger-border"
                value={state.incidenceComment}
                placeholder="Explicacion obligatoria"
                onChange={(event) =>
                  setState((current) => ({ ...current, incidenceComment: event.target.value }))
                }
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-2 rounded-lg border border-success-border bg-success-bg px-4 py-3 text-[13px] font-medium text-success-DEFAULT">
          <CheckCircle2 className="h-4 w-4" />
          Cierre cuadrado
        </section>
      )}

      <section className="space-y-1.5">
        <Label className="text-[12px]">Notas</Label>
        <textarea
          className="min-h-[84px] w-full resize-none rounded border border-border-strong bg-white px-3 py-2 text-sm text-ink shadow-inner-sm outline-none transition-all placeholder:text-ink-xmuted focus:border-primary focus:ring-2 focus:ring-primary/15"
          value={state.notes}
          placeholder="Observaciones del turno"
          onChange={(event) => setState((current) => ({ ...current, notes: event.target.value }))}
        />
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          loading={prefill.isPending}
          onClick={applyPrefill}
        >
          <Calculator className="h-4 w-4" />
          Autocompletar teorico
        </Button>
        <Button type="submit" loading={loading} disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export { money, shiftDisplay };
