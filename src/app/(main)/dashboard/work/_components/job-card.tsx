import type { ReactNode } from "react";

import Link from "next/link";

import { cn } from "cn";
import { Clock, MapPin, ThumbsUp } from "lucide-react";

import { CategoryIcon, PriorityBadge, SlaBadge } from "@/components/requests/badges";
import { formatDuration } from "@/domain/sla";
import type { RequestSummary } from "@/lib/queries";

/** Compact work-order card used on the board and in the list. */
export function JobCard({
  job,
  now,
  dragging,
  action,
}: {
  job: RequestSummary;
  now: number;
  dragging?: boolean;
  action?: ReactNode;
}) {
  const due = job.resolutionDueAt ? Date.parse(job.resolutionDueAt) : null;
  const dueText =
    due === null ? null : due >= now ? `${formatDuration(due - now)} left` : `${formatDuration(now - due)} overdue`;
  return (
    <div
      className={cn(
        "bg-card space-y-2 rounded-lg border p-3 shadow-xs",
        dragging && "shadow-lg ring-primary/30 ring-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/requests/${job.refCode}`}
          className="hover:text-primary line-clamp-2 text-sm font-medium"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {job.title}
        </Link>
        <CategoryIcon icon={job.category.icon} className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      </div>
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <MapPin className="size-3 shrink-0" /> <span className="truncate">{job.location.label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={job.priority} />
        <SlaBadge state={job.sla.resolution} />
        {job.voteCount > 0 && (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <ThumbsUp className="size-3" /> {job.voteCount}
          </span>
        )}
      </div>
      <div className="text-muted-foreground flex items-center justify-between border-t pt-2 text-[11px]">
        <span className="font-mono">{job.refCode}</span>
        {action}
        {dueText && job.status !== "resolved" && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              due !== null && due < now && "font-medium text-rose-600 dark:text-rose-400",
            )}
          >
            <Clock className="size-3" /> {dueText}
          </span>
        )}
      </div>
    </div>
  );
}
