import {
  BarChart3,
  Building2,
  CalendarDays,
  Clock3,
  CreditCard,
  Download,
  History,
  Landmark,
  MonitorSmartphone,
  PencilLine,
  Receipt,
  Rocket,
  Settings,
  ShieldCheck,
  StickyNote,
  TicketCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TutorialIcon as TutorialIconName } from "@/lib/tutorials";

const ICONS: Record<TutorialIconName, LucideIcon> = {
  rocket: Rocket,
  users: Users,
  building: Building2,
  calendar: CalendarDays,
  clock: Clock3,
  kiosk: MonitorSmartphone,
  history: History,
  edit: PencilLine,
  download: Download,
  cash: Landmark,
  notes: StickyNote,
  tickets: TicketCheck,
  expenses: Receipt,
  analytics: BarChart3,
  settings: Settings,
  shield: ShieldCheck,
  billing: CreditCard,
};

interface TutorialIconProps {
  icon: TutorialIconName;
  className?: string;
}

export function TutorialIcon({ icon, className }: TutorialIconProps) {
  const Icon = ICONS[icon];

  return <Icon className={cn("h-5 w-5", className)} aria-hidden="true" />;
}
