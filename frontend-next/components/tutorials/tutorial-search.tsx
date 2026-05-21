"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TutorialSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function TutorialSearch({ value, onChange }: TutorialSearchProps) {
  return (
    <div className="relative w-full">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-xmuted"
        aria-hidden="true"
      />
      <Input
        id="tutorial-search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar tutoriales"
        className="h-11 rounded-xl border-border-strong bg-white pl-10 pr-4 text-[14px] shadow-xs"
        type="search"
      />
    </div>
  );
}
