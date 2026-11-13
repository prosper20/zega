import Link from "next/link";

import { ArrowRight, CheckCircle2, ClipboardList, Clock, PlusCircle } from "lucide-react";

import { RequestRow } from "@/components/requests/request-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestListQuery } from "@/server/api/schemas/requests";
import { db } from "@/server/db";
import { listRequests } from "@/server/services/requests";
import type { CurrentUser } from "@/server/session-types";

const q = (input: Record<string, unknown>) => RequestListQuery.parse({ scope: "mine", ...input });

/** Student and staff dashboard: what is open, what needs their confirmation, and recent activity. */
export async function RequesterHome({ user }: { user: CurrentUser }) {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [open, awaiting, fixed, recent] = await Promise.all([
    listRequests(db, user, q({ open: "true", limit: 1 })),
    listRequests(db, user, q({ status: "resolved", limit: 5 })),
    listRequests(db, user, q({ status: "resolved,closed", from: since, limit: 1 })),
    listRequests(db, user, q({ limit: 5 })),
  ]);

  const stats = [
    { label: "Open requests", value: open.pageInfo.total, icon: Clock, href: "/dashboard/requests?tab=open" },
    {
      label: "Waiting for your confirmation",
      value: awaiting.pageInfo.total,
      icon: CheckCircle2,
      href: "/dashboard/requests?tab=open",
      highlight: awaiting.pageInfo.total > 0,
    },
    {
      label: "Fixed in the last 30 days",
      value: fixed.pageInfo.total,
      icon: ClipboardList,
      href: "/dashboard/requests?tab=done",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-sidebar text-sidebar-foreground relative overflow-hidden border-0">
        <div aria-hidden="true" className="bg-blueprint absolute inset-0 opacity-60" />
        <CardContent className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">Something broken?</h2>
            <p className="text-sm opacity-80">
              Report it in under a minute. Or scan the QR sticker in any room with your phone camera and the location is
              filled in for you.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="text-primary h-10 bg-white hover:bg-white/90">
              <Link href="/dashboard/requests/new">
                <PlusCircle data-icon="inline-start" /> Report an issue
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group">
            <Card
              className={`group-hover:border-primary/50 h-full transition-colors ${s.highlight ? "border-emerald-300 dark:border-emerald-500/40" : ""}`}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <span
                  className={`flex size-11 items-center justify-center rounded-xl ${s.highlight ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-accent text-accent-foreground"}`}
                >
                  <s.icon className="size-5" />
                </span>
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
                  <div className="text-muted-foreground text-sm">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {awaiting.data.length > 0 && (
        <Card className="border-emerald-300 dark:border-emerald-500/40">
          <CardHeader>
            <CardTitle className="text-base">Please confirm these fixes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y border-t">
              {awaiting.data.map((r) => (
                <RequestRow key={r.id} request={r} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent requests</CardTitle>
          <Link href="/dashboard/requests" className="text-primary inline-flex items-center gap-1 text-sm font-medium">
            View all <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recent.data.length ? (
            <div className="divide-y border-t">
              {recent.data.map((r) => (
                <RequestRow key={r.id} request={r} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground border-t p-6 text-sm">You have not reported anything yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
