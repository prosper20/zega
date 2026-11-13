import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import { MapPin, ThumbsUp } from "lucide-react";

import type { RequestSummary } from "@/lib/queries";

import { CategoryIcon, PriorityBadge, SlaBadge, StatusBadge } from "./badges";

/** One request in a list: compact, scannable, links to the tracking page. */
export function RequestRow({ request, showRequester }: { request: RequestSummary; showRequester?: boolean }) {
  return (
    <Link
      href={`/dashboard/requests/${request.refCode}`}
      className="hover:bg-muted/50 flex items-start gap-3 px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl sm:items-center"
    >
      <span className="bg-primary/10 text-primary hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex">
        <CategoryIcon icon={request.category.icon} className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{request.title}</span>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-mono">{request.refCode}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" /> {request.location.label}
          </span>
          <span>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</span>
          {showRequester && <span>by {request.requester.name}</span>}
          {request.voteCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="size-3" /> {request.voteCount}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <PriorityBadge priority={request.priority} className="hidden md:inline-flex" />
        <SlaBadge state={request.sla.resolution} className="hidden md:inline-flex" />
        <StatusBadge status={request.status} />
      </div>
    </Link>
  );
}
