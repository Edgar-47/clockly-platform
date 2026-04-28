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

  const handleClock = useCallback((submittedPin = pin) => {
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
  }, [clearPin, clockIn, clockOut, isClockedIn, pin, reset, selectedEmployee, setSuccess]);

  if (!employee) return null;

  const bg = avatarBg(employee.full_name);

  return (
    <div className="flex flex-col items-center gap-7 py-6 animate-slide-up">
      {/* Employee info */}
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white",
            bg,
          )}
        >
          {getInitials(employee.first_name, employee.last_name)}
        </div>
        <div className="text-center">
          <p className="text-[22px] font-bold text-white leading-tight">
            {employee.full_name}
          </p>
          <p
            className={cn(
              "text-[13px] font-semibold mt-1.5",
              isClockedIn ? "text-red-400" : "text-emerald-400",
            )}
          >
            {isClockedIn ? "↑ Registrar salida" : "↓ Registrar entrada"}
          </p>
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
                  ? "bg-red-400 border-red-400 scale-110"
                  : "bg-[#FF6B35] border-[#FF6B35] scale-110"
                : "border-white/20",
            )}
          />
        ))}
      </div>

      {errorMessage && (
        <div className="w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-[13px] font-semibold text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Geolocation notice */}
      <div className="flex gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-2.5 text-[12px] text-white/30">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF6B35]/60" />
        <span>
          Tu ubicación se usará solo para validar el fichaje. Puedes denegar el
          permiso.
        </span>
      </div>

      {/* Numpad */}
      <div className="grid w-full max-w-[280px] gap-2.5">
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
                    className="flex h-[60px] items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-white/30 hover:bg-white/[0.08] hover:text-white/50 transition-colors active:scale-95"
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
                  className="flex h-[60px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] text-[22px] font-bold text-white/80 hover:bg-white/[0.11] hover:text-white transition-all active:scale-95"
                >
                  {digit}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Back */}
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-2 text-[13px] text-white/30 hover:text-white/60 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>
    </div>
  );
}
