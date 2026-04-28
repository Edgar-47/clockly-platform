"use client";

import { useEffect, useState } from "react";

export function ClockDisplay() {
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [seconds, setSeconds] = useState<string>("");
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const parts = now
        .toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        .split(":");
      setHours(parts[0] ?? "");
      setMinutes(parts[1] ?? "");
      setSeconds(parts[2] ?? "");
      setDate(
        now.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-center select-none">
      <div className="flex items-baseline justify-center tabular-nums tracking-tight">
        <span className="text-[88px] font-bold text-[#1C1C1E] leading-none sm:text-[112px]">
          {hours}
        </span>
        <span className="text-[64px] font-extralight text-[#C7C7CC] leading-none mx-2 sm:text-[84px]">
          :
        </span>
        <span className="text-[88px] font-bold text-[#1C1C1E] leading-none sm:text-[112px]">
          {minutes}
        </span>
        <span className="text-[38px] font-extralight text-[#C7C7CC] leading-none mx-2 self-end mb-3 sm:text-[50px]">
          :
        </span>
        <span className="text-[44px] font-semibold text-[#FF6B35] leading-none self-end mb-1 sm:text-[56px]">
          {seconds}
        </span>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#AEAEB2] capitalize sm:text-[12px]">
        {date}
      </p>
    </div>
  );
}
