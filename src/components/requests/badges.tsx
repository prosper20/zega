import { cn } from "cn";
import {
  AlarmClock,
  Armchair,
  Building2,
  CircleCheck,
  CircleDashed,
  Droplets,
  Flame,
  type LucideIcon,
  Presentation,
  ShieldAlert,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

import { type RequestPriority, type RequestStatus, STATUS_LABELS } from "@/domain/constants";
import type { SlaState } from "@/domain/sla";

const STATUS_STYLE: Record<RequestStatus, string> = {
  submitted: "bg-muted text-muted-foreground",
  triaged: "bg-secondary text-secondary-foreground",
  assigned: "bg-secondary text-secondary-foreground",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  closed: "bg-emerald-600 text-white dark:bg-emerald-500/30 dark:text-emerald-100",
  reopened: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  rejected: "bg-muted text-muted-foreground line-through",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLE[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY: Record<RequestPriority, { label: string; className: string; icon?: LucideIcon }> = {
  low: { label: "Low", className: "text-muted-foreground" },
  medium: { label: "Medium", className: "text-foreground" },
  high: { label: "High", className: "text-orange-600 dark:text-orange-400", icon: AlarmClock },
  urgent: { label: "Urgent", className: "text-rose-600 dark:text-rose-400", icon: Flame },
};

export function PriorityBadge({ priority, className }: { priority: RequestPriority; className?: string }) {
  const p = PRIORITY[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", p.className, className)}>
      {p.icon ? <p.icon className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
      {p.label}
    </span>
  );
}

const SLA: Record<Exclude<SlaState, "none">, { label: string; className: string; icon: LucideIcon }> = {
  met: {
    label: "On time",
    className: "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300",
    icon: CircleCheck,
  },
  on_track: { label: "On track", className: "text-muted-foreground bg-muted", icon: CircleDashed },
  at_risk: {
    label: "At risk",
    className: "text-amber-800 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300",
    icon: AlarmClock,
  },
  breached: {
    label: "Overdue",
    className: "text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300",
    icon: ShieldAlert,
  },
};

export function SlaBadge({ state, className }: { state: SlaState; className?: string }) {
  if (state === "none") return null;
  const s = SLA[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
        s.className,
        className,
      )}
    >
      <s.icon className="size-3.5" /> {s.label}
    </span>
  );
}

const ICONS: Record<string, LucideIcon> = {
  zap: Zap,
  armchair: Armchair,
  droplets: Droplets,
  wifi: Wifi,
  presentation: Presentation,
  "building-2": Building2,
  wrench: Wrench,
};

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Wrench;
  return <Icon className={className} />;
}
