"use client";

import { Loader2, ThumbsUp, Users } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/requests/badges";
import { Button } from "@/components/ui/button";
import { errorMessage, useSimilar, useVote } from "@/lib/queries";

/**
 * Live duplicate detection: open requests in the same building with a similar title.
 * Instead of filing a duplicate, the reporter can add a "me too", which helps admins prioritise.
 */
export function DuplicatePanel({
  title,
  locationId,
  categoryId,
  locationLabel,
}: {
  title: string;
  locationId?: string;
  categoryId?: string;
  locationLabel?: string;
}) {
  const enabled = Boolean(locationId) && (title.length >= 3 || Boolean(categoryId));
  const similar = useSimilar({ title: title.length >= 3 ? title : "issue", locationId, categoryId }, enabled);
  const vote = useVote();
  const items = (similar.data ?? []).filter((r) => !r.mine);

  if (!enabled || items.length === 0) return null;

  return (
    <section
      aria-label="Similar open requests"
      className="rounded-xl border border-amber-300/70 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/5"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        {similar.isFetching ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
        Is this already reported? {items.length} open request{items.length === 1 ? "" : "s"} near{" "}
        {locationLabel?.split(" › ")[0] ?? "here"}
      </div>
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r.id} className="bg-background flex items-center gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.title}</div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono">{r.refCode}</span>
                <StatusBadge status={r.status} />
                <span className="truncate">{r.location}</span>
              </div>
            </div>
            <Button
              size="sm"
              variant={r.hasVoted ? "secondary" : "outline"}
              disabled={vote.isPending}
              onClick={() =>
                vote.mutate(
                  { id: r.id, on: !r.hasVoted },
                  {
                    onSuccess: (v) => {
                      toast.success(
                        v.hasVoted
                          ? `Added your “me too” to ${r.refCode}. You will be notified as it progresses.`
                          : "Removed your “me too”.",
                      );
                      void similar.refetch();
                    },
                    onError: (e) => toast.error(errorMessage(e)),
                  },
                )
              }
            >
              <ThumbsUp data-icon="inline-start" />
              {r.hasVoted ? "Me too ✓" : "Me too"} · {r.voteCount}
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-3 text-xs">
        Not the same problem? Just continue and submit your own report.
      </p>
    </section>
  );
}
