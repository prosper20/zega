"use client";

import { Fragment, useState } from "react";

import Link from "next/link";

import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { format } from "date-fns";
import { ChevronRight, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@/lib/api-client";
import { toQuery } from "@/lib/queries";

type Entry = {
  id: number;
  tableName: string;
  rowId: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  actorId: string | null;
  actorName: string | null;
  diff: {
    new?: Record<string, unknown>;
    old?: Record<string, unknown>;
    changes?: Record<string, { old: unknown; new: unknown }>;
  };
  hash: string;
  prevHash: string | null;
  createdAt: string;
};
type Verification = {
  intact: boolean;
  checked: number;
  firstBrokenId: number | null;
  durationMs: number;
  verifiedAt: string;
};

const TABLES: Record<string, string> = {
  service_requests: "Requests",
  status_logs: "Status changes",
  assignments: "Assignments",
  comments: "Comments",
  attachments: "Photos",
  ratings: "Ratings",
  users: "Users",
  roles: "Roles",
  request_categories: "Categories",
  sla_policies: "SLA policies",
  locations: "Locations",
};
const ACTION_STYLE = {
  INSERT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  UPDATE: "bg-secondary text-secondary-foreground",
  DELETE: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
};
const HIDDEN = new Set(["search", "created_at", "updated_at"]);

const show = (v: unknown) =>
  v === null || v === undefined ? "∅" : typeof v === "object" ? JSON.stringify(v) : String(v);

function summarise(e: Entry) {
  if (e.action === "UPDATE" && e.diff.changes)
    return (
      Object.keys(e.diff.changes)
        .filter((k) => !HIDDEN.has(k))
        .join(", ") || "updated"
    );
  const row = e.diff.new ?? e.diff.old ?? {};
  if (e.tableName === "ratings") return `${String(row.score)} out of 5${row.comment ? `: ${String(row.comment)}` : ""}`;
  if (e.tableName === "attachments")
    return `${String(row.kind)} photo (${Math.round(Number(row.size_bytes) / 1024)} KB)`;
  if (e.tableName === "assignments") return `officer ${String(row.officer_id)}`;
  return String(row.title ?? row.ref_code ?? row.name ?? row.to_status ?? row.body ?? row.email ?? "").slice(0, 80);
}

function requestLink(e: Entry) {
  const row = (e.diff.new ?? e.diff.old ?? {}) as Record<string, unknown>;
  const id = e.tableName === "service_requests" ? e.rowId : (row.request_id as string | undefined);
  return id ? `/dashboard/requests/${id}` : null;
}

export function AuditLog() {
  const [f, setF] = useQueryStates({ table: parseAsString.withDefault("") });
  const [open, setOpen] = useState<Set<number>>(new Set());
  const log = useInfiniteQuery({
    queryKey: ["audit", f],
    queryFn: ({ pageParam }) =>
      unwrap<{ data: Entry[]; nextBefore: number | null }>(
        fetch(`/api/audit${toQuery({ table: f.table, before: pageParam, limit: 50 })}`, { credentials: "include" }),
      ),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (p) => p.nextBefore ?? undefined,
  });
  const verify = useMutation({
    mutationFn: () => unwrap<Verification>(fetch("/api/audit/verify", { credentials: "include" })),
  });
  const rows = log.data?.pages.flatMap((p) => p.data) ?? [];
  const toggle = (id: number) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn(
          verify.data && (verify.data.intact ? "border-emerald-300 dark:border-emerald-500/40" : "border-rose-400"),
        )}
      >
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {verify.data?.intact === false ? (
              <ShieldAlert className="mt-0.5 size-6 text-rose-600" />
            ) : (
              <ShieldCheck className={cn("mt-0.5 size-6", verify.data ? "text-emerald-600" : "text-primary")} />
            )}
            <div>
              <div className="font-medium">
                {!verify.data
                  ? "Integrity check"
                  : verify.data.intact
                    ? `Intact: all ${verify.data.checked.toLocaleString()} entries verified`
                    : `Tampering detected at entry #${verify.data.firstBrokenId}`}
              </div>
              <p className="text-muted-foreground text-sm">
                {verify.data
                  ? `Recomputed every SHA-256 link in ${verify.data.durationMs} ms at ${format(new Date(verify.data.verifiedAt), "HH:mm:ss")}.`
                  : "Recomputes the hash chain over the whole log inside the database. Any edited or deleted entry breaks every link after it."}
              </p>
            </div>
          </div>
          <Button onClick={() => verify.mutate()} disabled={verify.isPending}>
            {verify.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <ShieldCheck data-icon="inline-start" />
            )}
            Verify integrity
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <NativeSelect
          aria-label="Table"
          value={f.table}
          onChange={(e) => void setF({ table: e.target.value || null })}
          className="h-9"
        >
          <NativeSelectOption value="">All changes</NativeSelectOption>
          {Object.entries(TABLES).map(([k, v]) => (
            <NativeSelectOption key={k} value={k}>
              {v}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="bg-card overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 pl-4" />
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>What</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="pr-4">Hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.isPending
              ? Array.from({ length: 8 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-7" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((e) => {
                  const expanded = open.has(e.id);
                  const link = requestLink(e);
                  return (
                    <Fragment key={e.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggle(e.id)} aria-expanded={expanded}>
                        <TableCell className="pl-4">
                          <ChevronRight
                            className={cn("text-muted-foreground size-4 transition-transform", expanded && "rotate-90")}
                          />
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap tabular-nums">
                          {format(new Date(e.createdAt), "d MMM yyyy, HH:mm:ss")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.actorName ?? <span className="text-muted-foreground">{e.actorId ?? "Unknown"}</span>}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", ACTION_STYLE[e.action])}
                          >
                            {e.action}
                          </span>{" "}
                          <span className="text-sm">{TABLES[e.tableName] ?? e.tableName}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-72 truncate text-sm">
                          {summarise(e)}
                        </TableCell>
                        <TableCell className="pr-4 font-mono text-[11px]" title={e.hash}>
                          #{e.id} · {e.hash.slice(0, 10)}…
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={5} className="space-y-3 py-3">
                            <DiffView entry={e} />
                            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
                              <span>row {e.rowId}</span>
                              <span>prev {e.prevHash?.slice(0, 16) ?? "GENESIS"}…</span>
                              <span>hash {e.hash.slice(0, 16)}…</span>
                              {link && (
                                <Link
                                  href={link}
                                  className="text-primary font-sans text-xs"
                                  onClick={(ev) => ev.stopPropagation()}
                                >
                                  Open request →
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {log.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void log.fetchNextPage()} disabled={log.isFetchingNextPage}>
            {log.isFetchingNextPage && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Load older entries
          </Button>
        </div>
      )}
    </div>
  );
}

function DiffView({ entry }: { entry: Entry }) {
  if (entry.diff.changes) {
    return (
      <div className="grid gap-1 text-xs">
        {Object.entries(entry.diff.changes)
          .filter(([k]) => !HIDDEN.has(k))
          .map(([k, v]) => (
            <div key={k} className="grid grid-cols-[140px_1fr] gap-2">
              <span className="text-muted-foreground font-mono">{k}</span>
              <span className="break-all">
                <span className="text-rose-700 line-through dark:text-rose-400">{show(v.old)}</span>{" "}
                <span className="text-muted-foreground">→</span>{" "}
                <span className="text-emerald-700 dark:text-emerald-400">{show(v.new)}</span>
              </span>
            </div>
          ))}
      </div>
    );
  }
  const row = entry.diff.new ?? entry.diff.old ?? {};
  return (
    <div className="grid gap-1 text-xs">
      {Object.entries(row)
        .filter(([k]) => !HIDDEN.has(k))
        .map(([k, v]) => (
          <div key={k} className="grid grid-cols-[140px_1fr] gap-2">
            <span className="text-muted-foreground font-mono">{k}</span>
            <span className="break-all">{show(v)}</span>
          </div>
        ))}
      <Badge variant="outline" className="mt-1 w-fit">
        {entry.action === "INSERT" ? "Created" : "Deleted"}
      </Badge>
    </div>
  );
}
