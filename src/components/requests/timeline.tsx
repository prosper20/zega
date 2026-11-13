"use client";

import { cn } from "cn";
import { formatDistanceToNow } from "date-fns";
import { ArrowRightLeft, Camera, CircleDot, Lock, MessageSquare, UserCheck } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABELS } from "@/domain/constants";
import type { TimelineItem } from "@/lib/queries";

const when = (at: string) => (
  <time dateTime={at} title={new Date(at).toLocaleString()} className="text-muted-foreground text-xs">
    {formatDistanceToNow(new Date(at), { addSuffix: true })}
  </time>
);

const ICON = { status: CircleDot, assignment: UserCheck, comment: MessageSquare, attachment: Camera } as const;

/** Vertical activity feed for a request: status changes, assignments, comments and photos. */
export function Timeline({ items, loading }: { items: TimelineItem[] | undefined; loading?: boolean }) {
  if (loading)
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  if (!items?.length) return <p className="text-muted-foreground text-sm">No activity yet.</p>;
  return (
    <ol className="before:bg-border relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px">
      {items.map((item, i) => {
        const Icon = item.kind === "status" && item.from && item.to ? ArrowRightLeft : ICON[item.kind];
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: timeline items have no stable id and never reorder
          <li key={i} className="relative flex gap-3">
            <span
              className={cn(
                "bg-background relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
                item.kind === "status" && item.to === "resolved" && "border-emerald-300 text-emerald-600",
                item.kind === "comment" && item.internal && "border-amber-300 text-amber-600",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              {item.kind === "status" && (
                <>
                  <p className="text-sm">
                    <span className="font-medium">{item.actor?.name ?? "System"}</span>{" "}
                    {item.from ? (
                      <>
                        moved it to <span className="font-medium">{STATUS_LABELS[item.to]}</span>
                      </>
                    ) : (
                      "reported this request"
                    )}{" "}
                    · {when(item.at)}
                  </p>
                  {item.note && (
                    <p className="bg-muted/60 mt-1.5 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">{item.note}</p>
                  )}
                </>
              )}
              {item.kind === "assignment" && (
                <>
                  <p className="text-sm">
                    <span className="font-medium">{item.actor?.name ?? "An administrator"}</span> assigned{" "}
                    <span className="font-medium">{item.officer.name}</span> · {when(item.at)}
                  </p>
                  {item.note && <p className="bg-muted/60 mt-1.5 rounded-lg px-3 py-2 text-sm">{item.note}</p>}
                </>
              )}
              {item.kind === "comment" && (
                <div
                  className={cn(
                    "rounded-xl border px-3 py-2",
                    item.internal && "border-amber-300/60 bg-amber-50 dark:bg-amber-500/5",
                  )}
                >
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{item.actor.name}</span>
                    {item.internal && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <Lock className="size-3" /> Internal note
                      </span>
                    )}
                    {when(item.at)}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{item.body}</p>
                </div>
              )}
              {item.kind === "attachment" && (
                <p className="text-sm">
                  <span className="font-medium">{item.actor.name}</span> added{" "}
                  {item.attachmentKind === "evidence" ? "a photo" : `an ${item.attachmentKind} photo`} · {when(item.at)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
