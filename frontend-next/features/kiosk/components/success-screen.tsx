"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKioskStore } from "@/features/kiosk/kiosk.store";

export function SuccessScreen() {
  const { selectedEmployee, successType } = useKioskStore();
  const employee = selectedEmployee?.employee;
  const isIn = successType === "in";

  return (
    <div className="flex flex-col items-center gap-7 py-12 animate-scale-in">
      {/* Icon */}
      <div
        className={cn(
          "flex h-28 w-28 items-center justify-center rounded-full border-2",
          isIn
            ? "bg-[#F0FDF4] border-[#34C759]/30"
            : "bg-[#FFF1F0] border-[#FF3B30]/25",
        )}
      >
        {isIn ? (
          <CheckCircle className="h-14 w-14 text-[#34C759]" strokeWidth={1.5} />
        ) : (
          <XCircle className="h-14 w-14 text-[#FF3B30]" strokeWidth={1.5} />
        )}
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-[34px] font-bold text-[#1C1C1E] leading-tight tracking-tight">
          {isIn ? "¡Bienvenido/a!" : "¡Hasta luego!"}
        </p>
        {employee && (
          <p className="mt-2 text-[18px] text-[#636366] font-medium">{employee.full_name}</p>
        )}
        <div
          className={cn(
            "mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2 text-[14px] font-semibold border",
            isIn
              ? "bg-[#F0FDF4] border-[#34C759]/25 text-[#34C759]"
              : "bg-[#FFF1F0] border-[#FF3B30]/20 text-[#FF3B30]",
          )}
        >
          {isIn ? (
            <CheckCircle className="h-4 w-4" strokeWidth={2.5} />
          ) : (
            <XCircle className="h-4 w-4" strokeWidth={2.5} />
          )}
          {isIn ? "Entrada registrada" : "Salida registrada"}
        </div>
      </div>

      <p className="text-[13px] text-[#AEAEB2]">
        Volviendo al inicio en unos segundos…
      </p>
    </div>
  );
}
