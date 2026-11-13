"use client";

import { useQuery } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type RequestStatus, STATUS_LABELS } from "@/domain/constants";
import { unwrap } from "@/lib/api-client";
import { toQuery } from "@/lib/queries";

import { rangeDates, type Summary } from "../../../_components/home/admin/use-summary";

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function ReportBuilder() {
  const def = rangeDates(30);
  const [r, setR] = useQueryStates({
    from: parseAsString.withDefault(def.from),
    to: parseAsString.withDefault(def.to),
  });
  const summary = useQuery({
    queryKey: ["reports", "summary", r],
    queryFn: () => unwrap<Summary>(fetch(`/api/reports/summary${toQuery(r)}`, { credentials: "include" })),
    placeholderData: (p) => p,
  });
  const s = summary.data;
  const qs = toQuery(r);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={r.from}
                max={r.to}
                onChange={(e) => void setR({ from: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={r.to}
                min={r.from}
                onChange={(e) => void setR({ to: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="flex gap-1">
              {PRESETS.map((p) => (
                <Button key={p.days} variant="ghost" size="sm" onClick={() => void setR(rangeDates(p.days))}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild className="h-9">
              <a href={`/api/reports/summary.pdf${qs}`}>
                <FileDown data-icon="inline-start" /> Download PDF
              </a>
            </Button>
            <Button asChild variant="outline" className="h-9">
              <a href={`/api/exports/requests.csv${qs}`} download>
                <FileSpreadsheet data-icon="inline-start" /> Export CSV
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!s ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Reported", s.totals.total],
              ["Resolved or closed", s.totals.resolved + s.totals.closed],
              ["SLA compliance", s.totals.slaCompliance === null ? "n/a" : `${s.totals.slaCompliance}%`],
              [
                "Avg. time to resolve",
                s.totals.avgResolutionHours === null ? "n/a" : `${s.totals.avgResolutionHours} h`,
              ],
              ["Avg. first response", s.totals.avgResponseHours === null ? "n/a" : `${s.totals.avgResponseHours} h`],
              ["Still open", s.totals.open],
              ["Overdue (open)", s.totals.breachedOpen],
              ["Satisfaction", s.totals.avgRating === null ? "n/a" : `${s.totals.avgRating.toFixed(2)} / 5`],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="text-muted-foreground text-xs">{label}</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ReportTable
              title="By category"
              head={["Category", "Total", "Open", "Avg. hours"]}
              rows={s.byCategory.map((c) => [c.category, c.count, c.open, c.avgResolutionHours ?? "n/a"])}
            />
            <ReportTable
              title="Officer performance"
              head={["Officer", "Open", "Resolved", "Rating"]}
              rows={s.officers.map((o) => [o.name, o.open, o.resolved, o.avgRating ? o.avgRating.toFixed(2) : "n/a"])}
            />
            <ReportTable
              title="By status"
              head={["Status", "Requests"]}
              rows={s.byStatus.map((x) => [STATUS_LABELS[x.status as RequestStatus], x.count])}
            />
            <ReportTable
              title="Hotspots"
              head={["Building or hostel", "Requests"]}
              rows={s.hotspots.map((h) => [h.name, h.count])}
            />
          </div>
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <FileText className="size-3.5" /> The PDF contains these tables plus a daily volume chart, ready to share
            with management.
          </p>
        </>
      )}
    </div>
  );
}

function ReportTable({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{rows.length} rows</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {head.map((h, i) => (
                <TableHead key={h} className={i === 0 ? "pl-6" : "pr-6 text-right"}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={String(r[0])}>
                {r.map((v, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed column order
                  <TableCell key={i} className={i === 0 ? "pl-6 font-medium" : "pr-6 text-right tabular-nums"}>
                    {v}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
