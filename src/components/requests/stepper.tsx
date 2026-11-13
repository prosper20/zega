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
    <ol className="flex w-full items-start" aria-label="Request progress">
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
                current && !stopped && "ring-primary/20 ring-4",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn("text-xs", done ? "font-medium" : "text-muted-foreground")}>{step.label}</span>
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
