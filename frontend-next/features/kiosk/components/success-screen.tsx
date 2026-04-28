"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { useKioskStore } from "@/features/kiosk/kiosk.store";

export function SuccessScreen() {
  const { selectedEmployee, successType } = useKioskStore();
  const employee = selectedEmployee?.employee;
  const isIn = successType === "in";

  return (
    <div className="flex flex-col items-center gap-6 py-16 animate-scale-in">
      {/* Icon */}
      <div
        className={
          isIn
            ? "flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25"
            : "flex h-24 w-24 items-center justify-center rounded-full bg-red-500/15 border border-red-500/25"
        }
      >
        {isIn ? (
          <CheckCircle className="h-12 w-12 text-emerald-400" />
        ) : (
          <XCircle className="h-12 w-12 text-red-400" />
        )}
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-[32px] font-bold text-white leading-tight">
          {isIn ? "¡Bienvenido/a!" : "¡Hasta luego!"}
        </p>
        {employee && (
          <p className="mt-2 text-[18px] text-white/50">{employee.full_name}</p>
        )}
        <p
          className={
            "mt-3 text-[15px] font-semibold " +
            (isIn ? "text-emerald-400" : "text-red-400")
          }
        >
          {isIn ? "Entrada registrada" : "Salida registrada"}
        </p>
      </div>

      <p className="text-[13px] text-white/20">
        Volviendo al inicio en unos segundos…
      </p>
    </div>
  );
}
