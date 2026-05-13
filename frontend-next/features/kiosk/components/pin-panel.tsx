"use client";

import { useCallback, useState } from "react";
import { Delete, ArrowLeft, MapPin } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useKioskStore } from "@/features/kiosk/kiosk.store";
import { useClockIn, useClockOut } from "@/hooks/use-attendance";
import { toast } from "sonner";

const DIGITS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-teal-500",
];

function avatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function PinPanel() {
  const { selectedEmployee, pin, appendPin, clearPin, reset, setSuccess } =
    useKioskStore();

  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isClockedIn = selectedEmployee?.is_clocked_in ?? false;
  const employee = selectedEmployee?.employee;

  const handleClock = useCallback(
    (submittedPin = pin) => {
      if (!selectedEmployee) return;
      setErrorMessage(null);
      const action = isClockedIn ? clockOut : clockIn;
      action.mutate(
        { employee_id: selectedEmployee.employee.id, method: "kiosk", pin: submittedPin },
        {
          onSuccess: () => {
            setSuccess(isClockedIn ? "out" : "in");
            setTimeout(reset, 3000);
          },
          onError: (err) => {
            const message = (err as Error).message || "Error al fichar";
            setErrorMessage(message);
            toast.error(message);
            clearPin();
          },
        },
      );
    },
    [clearPin, clockIn, clockOut, isClockedIn, pin, reset, selectedEmployee, setSuccess],
  );

  if (!employee) return null;

  const bg = avatarBg(employee.full_name);

  return (
    <div className="flex flex-col items-center gap-5 py-2 animate-slide-up sm:gap-6">
      {/* Employee card */}
      <div className="w-full rounded-3xl bg-white border border-black/[0.06] shadow-sm px-6 py-6 flex flex-col items-center gap-4">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-sm sm:h-20 sm:w-20 sm:text-2xl",
            bg,
          )}
        >
          {getInitials(employee.first_name, employee.last_name)}
        </div>
        <div className="text-center">
          <p className="text-[20px] font-bold text-[#1C1C1E] leading-tight sm:text-[24px]">
            {employee.full_name}
          </p>
          <div
            className={cn(
              "mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold border",
              isClockedIn
                ? "bg-[#FFF1F0] border-[#FF3B30]/20 text-[#FF3B30]"
                : "bg-[#F0FDF4] border-[#34C759]/20 text-[#34C759]",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isClockedIn ? "bg-[#FF3B30]" : "bg-[#34C759] animate-pulse-dot",
              )}
            />
            {isClockedIn ? "Registrar salida" : "Registrar entrada"}
          </div>
        </div>
      </div>

      {/* PIN dots */}
      <div className="flex items-center gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3.5 w-3.5 rounded-full border-2 transition-all duration-150",
              i < pin.length
                ? isClockedIn
                  ? "bg-[#FF3B30] border-[#FF3B30] scale-110"
                  : "bg-[#FF6B35] border-[#FF6B35] scale-110"
                : "border-[#C7C7CC] bg-transparent",
            )}
          />
        ))}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="w-full rounded-2xl border border-[#FF3B30]/20 bg-[#FFF1F0] px-4 py-3 text-center text-[13px] font-semibold text-[#FF3B30]">
          {errorMessage}
        </div>
      )}

      {/* Numpad */}
      <div className="grid w-full max-w-[260px] gap-2.5 sm:max-w-[290px]">
        {DIGITS.map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-2.5">
            {row.map((digit, ci) => {
              if (digit === "") return <div key={ci} />;
              if (digit === "del")
                return (
                  <button
                    key={ci}
                    type="button"
                    aria-label="Borrar PIN"
                    onClick={clearPin}
                    className="flex h-[58px] items-center justify-center rounded-2xl bg-white border border-black/[0.08] shadow-sm text-[#8E8E93] hover:bg-[#F2F2F7] hover:text-[#1C1C1E] transition-all active:scale-95 sm:h-[64px]"
                  >
                    <Delete className="h-5 w-5" aria-hidden="true" />
                  </button>
                );
              return (
                <button
                  key={ci}
                  type="button"
                  onClick={() => {
                    const nextPin = `${pin}${digit}`.slice(0, 4);
                    appendPin(digit);
                    if (nextPin.length === 4) {
                      handleClock(nextPin);
                    }
                  }}
                  className="flex h-[58px] items-center justify-center rounded-2xl bg-white border border-black/[0.08] shadow-sm text-[22px] font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7] transition-all active:scale-95 sm:h-[64px] sm:text-[24px]"
                >
                  {digit}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Privacy notice */}
      <div className="flex gap-2 w-full rounded-2xl border border-black/[0.06] bg-white px-3.5 py-2.5 text-[11px] text-[#8E8E93] sm:text-[12px]">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF6B35]" />
        <span>Tu ubicación se usará solo para validar el fichaje. Puedes denegar el permiso.</span>
      </div>

      {/* Back */}
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-2 text-[13px] text-[#8E8E93] hover:text-[#1C1C1E] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>
    </div>
  );
}
