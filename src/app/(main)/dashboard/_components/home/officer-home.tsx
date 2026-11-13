import Link from "next/link";

import { AlarmClock, ArrowRight, CheckCircle2, Hammer, ShieldAlert, Star, Wrench } from "lucide-react";

import { RequestRow } from "@/components/requests/request-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestListQuery } from "@/server/api/schemas/requests";
import { db } from "@/server/db";
import { officerSummary } from "@/server/services/reports";
import { listRequests } from "@/server/services/requests";
import type { CurrentUser } from "@/server/session-types";

/** Officer dashboard: today's workload at a glance and the next jobs by due time. */
export async function OfficerHome({ user }: { user: CurrentUser }) {
  const [stats, next] = await Promise.all([
    officerSummary(db, user.id),
    listRequests(db, user, RequestListQuery.parse({ assignee: "me", open: "true", sort: "due", limit: 6 })),
  ]);

  const tiles = [
    { label: "Open jobs", value: stats.open, icon: Wrench },
    { label: "In progress", value: stats.inProgress, icon: Hammer },
    { label: "Overdue", value: stats.overdue, icon: ShieldAlert, tone: stats.overdue ? "danger" : undefined },
    { label: "Due in 24 hours", value: stats.dueSoon, icon: AlarmClock, tone: stats.dueSoon ? "warn" : undefined },
    { label: "Resolved this week", value: stats.resolvedThisWeek, icon: CheckCircle2 },
    { label: "Average rating", value: stats.avgRating ? `${stats.avgRating.toFixed(1)} / 5` : "None yet", icon: Star },
  ] as const;

  const toneClass = (tone?: string) =>
    tone === "danger"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      : tone === "warn"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
        : "bg-accent text-accent-foreground";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="space-y-3 p-4">
              <span
                className={`flex size-9 items-center justify-center rounded-lg ${toneClass("tone" in t ? t.tone : undefined)}`}
              >
                <t.icon className="size-4" />
              </span>
              <div>
                <div className="text-2xl font-semibold tabular-nums">{t.value}</div>
                <div className="text-muted-foreground text-xs">{t.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.overdue > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-200">
          <strong>{stats.overdue}</strong> job{stats.overdue > 1 ? "s are" : " is"} past the resolution target. Tackle{" "}
          {stats.overdue > 1 ? "them" : "it"} first, or put on hold with a reason.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Next up</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/work">
              Open board <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {next.data.length ? (
            <div className="divide-y border-t">
              {next.data.map((r) => (
                <RequestRow key={r.id} request={r} showRequester />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground border-t p-6 text-sm">No open jobs. Nice work.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
