"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { LateArrival } from "@/types/late-arrival";

interface Props {
  record: LateArrival;
  onClose: () => void;
  onSubmit: (justification: string) => void;
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function JustifyLateArrivalModal({ record, onClose, onSubmit }: Props) {
  const [justification, setJustification] = useState(record.justification_text ?? "");

  const employeeName = record.employee
    ? `${record.employee.first_name} ${record.employee.last_name}`
    : "Empleado";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Justificar retraso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-surface-bg p-3 text-[13px]">
            <p className="font-medium text-ink">{employeeName}</p>
            <p className="mt-0.5 text-ink-muted">
              {formatDate(record.date)} · +{record.delay_minutes_total} min retraso
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-ink">
              Motivo de justificación
            </label>
            <textarea
              placeholder="Describe el motivo del retraso (ej: cita médica, problema de transporte…)"
              className="w-full min-h-[100px] rounded-md border border-border bg-transparent px-3 py-2 text-[13px] resize-none placeholder:text-ink-xmuted focus:outline-none focus:ring-1 focus:ring-primary"
              value={justification}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJustification(e.target.value)}
              maxLength={2000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSubmit(justification)}
            disabled={!justification.trim()}
          >
            Justificar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
