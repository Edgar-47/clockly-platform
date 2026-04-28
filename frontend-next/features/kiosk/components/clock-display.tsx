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
      <div className="flex items-baseline justify-center tabular-nums">
        <span className="kiosk-time-hm text-[104px] text-slate-900 leading-none">
          {hours}
        </span>
        <span className="kiosk-time-sep text-[80px] text-slate-300 leading-none mx-1 mb-1">
          :
        </span>
        <span className="kiosk-time-hm text-[104px] text-slate-900 leading-none">
          {minutes}
        </span>
        <span className="kiosk-time-sep text-[48px] text-slate-300 leading-none mx-1 self-end mb-3">
          :
        </span>
        <span className="kiosk-time-sec text-[56px] text-[#FF6B35] leading-none self-end mb-1.5">
          {seconds}
        </span>
      </div>
      <p className="kiosk-date mt-4 text-[11px] uppercase text-slate-400 capitalize">
        {date}
      </p>
    </div>
  );
}
