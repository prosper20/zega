"use client";

import Link from "next/link";

import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Clock, Gauge, Inbox, Star } from "lucide-react";
import { parseAsNumberLiteral, useQueryState } from "nuqs";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { RequestRow } from "@/components/requests/request-row";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type RequestStatus, STATUS_LABELS } from "@/domain/constants";
import { useRequestList } from "@/lib/queries";

import { useSummary } from "./use-summary";

const RANGES = [7, 30, 90] as const;

const trendConfig = {
  created: { label: "Reported", color: "var(--chart-1)" },
  resolved: { label: "Resolved", color: "var(--chart-2)" },
} satisfies ChartConfig;
const categoryConfig = {
  count: { label: "Requests", color: "var(--chart-1)" },
  open: { label: "Still open", color: "var(--chart-3)" },
} satisfies ChartConfig;
const STATUS_COLORS: Partial<Record<RequestStatus, string>> = {
  submitted: "var(--chart-5)",
  triaged: "var(--chart-5)",
  assigned: "var(--chart-1)",
  in_progress: "var(--chart-3)",
  on_hold: "var(--chart-4)",
  resolved: "var(--chart-2)",
  closed: "var(--color-emerald-600)",
  reopened: "var(--chart-4)",
  rejected: "var(--muted-foreground)",
  cancelled: "var(--border)",
};

export function AdminDashboard() {
  const [days, setDays] = useQueryState("range", parseAsNumberLiteral(RANGES).withDefault(30));
  const summary = useSummary(days);
  const unassigned = useRequestList({
    assignee: "none",
    status: ["submitted", "triaged", "reopened"],
    sort: "oldest",
    limit: 5,
  });
  const breached = useRequestList({ sla: "breached", open: "true", sort: "due", limit: 5 });
  const s = summary.data;

  const kpis = s
    ? [
        { label: "Requests", value: s.totals.total, hint: `${s.totals.open} open`, icon: ClipboardList },
        {
          label: "Unassigned",
          value: unassigned.data?.pages[0]?.pageInfo.total ?? "…",
          hint: "waiting for triage",
          icon: Inbox,
          tone: (unassigned.data?.pages[0]?.pageInfo.total ?? 0) > 0 ? "warn" : undefined,
        },
        {
          label: "Overdue (open)",
          value: s.totals.breachedOpen,
          hint: "past resolution target",
          icon: AlertTriangle,
          tone: s.totals.breachedOpen > 0 ? "danger" : undefined,
        },
        {
          label: "SLA compliance",
          value: s.totals.slaCompliance === null ? "n/a" : `${s.totals.slaCompliance}%`,
          hint: "resolved within target",
          icon: Gauge,
        },
        {
          label: "Avg. resolution",
          value: s.totals.avgResolutionHours === null ? "n/a" : `${s.totals.avgResolutionHours}h`,
          hint: `first response ${s.totals.avgResponseHours ?? "n/a"}h`,
          icon: Clock,
        },
        {
          label: "Satisfaction",
          value: s.totals.avgRating === null ? "n/a" : `${s.totals.avgRating.toFixed(1)}★`,
          hint: `${s.totals.ratings} ratings`,
          icon: Star,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">Campus maintenance at a glance.</p>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(days)}
          onValueChange={(v) => v && void setDays(Number(v) as (typeof RANGES)[number])}
          aria-label="Date range"
        >
          {RANGES.map((r) => (
            <ToggleGroupItem key={r} value={String(r)} className="px-3">
              {r} days
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {summary.isPending
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28" />)
          : kpis.map((k) => (
              <Card key={k.label}>
                <CardContent className="space-y-2 p-4">
                  <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
                    {k.label}
                    <k.icon
                      className={`size-4 ${"tone" in k && k.tone === "danger" ? "text-rose-600" : "tone" in k && k.tone === "warn" ? "text-amber-600" : ""}`}
                    />
                  </div>
                  <div className="text-2xl font-semibold tabular-nums">{k.value}</div>
                  <div className="text-muted-foreground text-xs">{k.hint}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Reported vs resolved</CardTitle>
            <CardDescription>Daily volume over the last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            {s ? (
              <ChartContainer config={trendConfig} className="aspect-auto h-64 w-full">
                <AreaChart data={s.daily} margin={{ left: -16, right: 8 }}>
                  <defs>
                    {(["created", "resolved"] as const).map((k) => (
                      <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tickFormatter={(d: string) =>
                      new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                    }
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stroke="var(--color-created)"
                    fill="url(#fill-created)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stroke="var(--color-resolved)"
                    fill="url(#fill-resolved)"
                    strokeWidth={2}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <Skeleton className="h-64" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By status</CardTitle>
            <CardDescription>Where requests are right now</CardDescription>
          </CardHeader>
          <CardContent>
            {s ? (
              <div className="flex flex-col items-center gap-4">
                <ChartContainer config={{}} className="aspect-square h-44">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                    <Pie
                      data={s.byStatus.map((x) => ({ ...x, status: STATUS_LABELS[x.status as RequestStatus] }))}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={48}
                      strokeWidth={2}
                    >
                      {s.byStatus.map((x) => (
                        <Cell key={x.status} fill={STATUS_COLORS[x.status as RequestStatus] ?? "var(--chart-5)"} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {s.byStatus.map((x) => (
                    <li key={x.status} className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-sm"
                        style={{ background: STATUS_COLORS[x.status as RequestStatus] }}
                      />
                      <span className="text-muted-foreground flex-1">{STATUS_LABELS[x.status as RequestStatus]}</span>
                      <span className="font-medium tabular-nums">{x.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <Skeleton className="h-64" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By category</CardTitle>
            <CardDescription>Volume and what is still open</CardDescription>
          </CardHeader>
          <CardContent>
            {s ? (
              <ChartContainer config={categoryConfig} className="aspect-auto h-64 w-full">
                <BarChart data={s.byCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} />
                  <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={120} />
                  <XAxis type="number" allowDecimals={false} hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  <Bar dataKey="open" fill="var(--color-open)" radius={4} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            ) : (
              <Skeleton className="h-64" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hotspots</CardTitle>
            <CardDescription>Buildings and hostels with the most reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {s
              ? s.hotspots.map((h) => {
                  const max = s.hotspots[0]?.count || 1;
                  return (
                    <div key={h.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{h.name}</span>
                        <span className="font-medium tabular-nums">{h.count}</span>
                      </div>
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${(h.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              : [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Queue
          title="Needs triage"
          description="Unassigned, oldest first"
          list={unassigned}
          empty="Every request has an officer."
          href="/dashboard/admin/requests?assignee=none&open=true&sort=oldest"
        />
        <Queue
          title="Overdue"
          description="Open and past the resolution target"
          list={breached}
          empty="Nothing overdue."
          href="/dashboard/admin/requests?sla=breached&open=true&sort=due"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Officer workload</CardTitle>
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/admin/users?role=officer">
                Manage <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Officer</TableHead>
                <TableHead className="text-right">Open jobs</TableHead>
                <TableHead className="text-right">Resolved ({days}d)</TableHead>
                <TableHead className="pr-6 text-right">Avg. rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s?.officers.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="pl-6 font-medium">{o.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.open}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.resolved}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">
                    {o.avgRating ? `${o.avgRating.toFixed(1)}★` : "n/a"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Queue({
  title,
  description,
  list,
  empty,
  href,
}: {
  title: string;
  description: string;
  list: ReturnType<typeof useRequestList>;
  empty: string;
  href: string;
}) {
  const rows = list.data?.pages[0]?.data ?? [];
  const total = list.data?.pages[0]?.pageInfo.total ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {title} {total > 0 && <span className="text-muted-foreground font-normal">({total})</span>}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={href}>
              View all <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {list.isPending ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length ? (
          <div className="divide-y border-t">
            {rows.map((r) => (
              <RequestRow key={r.id} request={r} showRequester />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground flex items-center gap-2 border-t p-6 text-sm">
            <CheckCircle2 className="size-4 text-emerald-600" /> {empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
