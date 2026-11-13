import { cn } from "cn";
import { Check, X } from "lucide-react";

import type { RequestStatus } from "@/domain/constants";

const STEPS: { key: string; label: string; reached: RequestStatus[] }[] = [
  {
    key: "submitted",
    label: "Submitted",
    reached: ["submitted", "triaged", "assigned", "in_progress", "on_hold", "resolved", "closed", "reopened"],
  },
  {
    key: "assigned",
    label: "Assigned",
    reached: ["assigned", "in_progress", "on_hold", "resolved", "closed", "reopened"],
  },
  { key: "in_progress", label: "In progress", reached: ["in_progress", "on_hold", "resolved", "closed"] },
  { key: "resolved", label: "Resolved", reached: ["resolved", "closed"] },
  { key: "closed", label: "Confirmed", reached: ["closed"] },
];

/** Horizontal progress through the lifecycle; rejected/cancelled requests show where they stopped. */
export function RequestStepper({ status }: { status: RequestStatus }) {
  const stopped = status === "rejected" || status === "cancelled";
  return (
    <>
      <CompactStepper status={status} stopped={stopped} />
      <FullStepper status={status} stopped={stopped} />
    </>
  );
}

/**
 * Phones: five labels do not fit side by side, and there is no hover to reveal them. Show a
 * segmented bar with the current stage spelled out and what comes next, all visible at once.
 */
function CompactStepper({ status, stopped }: { status: RequestStatus; stopped: boolean }) {
  const reached = STEPS.filter((s) => s.reached.includes(status)).length;
  const current = STEPS[Math.max(reached - 1, 0)];
  const next = STEPS[reached];
  let label = current.label;
  if (stopped) label = status === "rejected" ? "Rejected" : "Cancelled";
  const fill = stopped ? "bg-destructive/60" : "bg-primary";
  return (
    <div className="space-y-2.5 sm:hidden">
      <ol className="flex gap-1" aria-hidden="true">
        {STEPS.map((step, i) => (
          <li key={step.key} className={cn("h-1.5 flex-1 rounded-full", i < reached ? fill : "bg-border")} />
        ))}
      </ol>
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn("text-sm font-semibold", stopped ? "text-destructive" : "text-primary")}>{label}</p>
        <p className="text-muted-foreground text-xs tabular-nums">
          Step {reached} of {STEPS.length}
        </p>
      </div>
      {!stopped && (
        <p className="text-muted-foreground text-xs">
          {next && (
            <>
              Next: <span className="text-foreground font-medium">{next.label}</span>
            </>
          )}
          {!next && "All steps complete"}
        </p>
      )}
    </div>
  );
}

function FullStepper({ status, stopped }: { status: RequestStatus; stopped: boolean }) {
  return (
    <ol className="hidden w-full items-start sm:flex" aria-label="Request progress">
      {STEPS.map((step, i) => {
        const done = step.reached.includes(status);
        const current = done && !STEPS[i + 1]?.reached.includes(status);
        return (
          <li key={step.key} className="relative flex flex-1 flex-col items-center gap-2 text-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                done ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "text-xs",
                current && !stopped ? "text-primary font-semibold" : done ? "font-medium" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
      {stopped && (
        <li className="relative flex flex-1 flex-col items-center gap-2 text-center">
          <span className="bg-destructive/10 text-destructive relative z-10 flex size-7 items-center justify-center rounded-full">
            <X className="size-3.5" strokeWidth={3} />
          </span>
          <span className="text-destructive text-xs font-medium">
            {status === "rejected" ? "Rejected" : "Cancelled"}
          </span>
        </li>
      )}
    </ol>
  );
}
