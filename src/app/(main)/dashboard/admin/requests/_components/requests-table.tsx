"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { formatDistanceToNow } from "date-fns";
import { Download, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { toast } from "sonner";

import { CategoryIcon, PriorityBadge, SlaBadge, StatusBadge } from "@/components/requests/badges";
import { ResponsiveList } from "@/components/responsive-list";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { REQUEST_PRIORITIES, REQUEST_STATUSES, STATUS_LABELS } from "@/domain/constants";
import { useDebounced } from "@/hooks/use-debounced";
import { useIsMobile } from "@/hooks/use-mobile";
import { unwrap } from "@/lib/api-client";
import { errorMessage, toQuery, useCategories, useRequestList } from "@/lib/queries";

import { MultiFilter } from "./multi-filter";

type Officer = { id: string; name: string };
const SORTS = ["newest", "oldest", "priority", "due"] as const;

export function RequestsTable() {
  const qc = useQueryClient();
  const [f, setF] = useQueryStates({
    q: parseAsString.withDefault(""),
    status: parseAsArrayOf(parseAsString).withDefault([]),
    priority: parseAsArrayOf(parseAsString).withDefault([]),
    category: parseAsString.withDefault(""),
    assignee: parseAsString.withDefault(""),
    sla: parseAsString.withDefault(""),
    open: parseAsString.withDefault(""),
    from: parseAsString.withDefault(""),
    to: parseAsString.withDefault(""),
    sort: parseAsStringLiteral(SORTS).withDefault("newest"),
  });
  const q = useDebounced(f.q);
  const params = useMemo(
    () => ({
      q: q || undefined,
      status: f.status,
      priority: f.priority,
      category: f.category || undefined,
      assignee: f.assignee || undefined,
      sla: f.sla || undefined,
      open: f.open || undefined,
      from: f.from || undefined,
      to: f.to || undefined,
      sort: f.sort,
    }),
    [q, f],
  );
  const list = useRequestList({ ...params, limit: 25 });
  const categories = useCategories();
  const officers = useQuery({
    queryKey: ["users", "officers"],
    queryFn: () => unwrap<{ data: Officer[] }>(fetch("/api/users?role=officer&limit=100", { credentials: "include" })),
    staleTime: 5 * 60_000,
  });
  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.pageInfo.total ?? 0;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mobile = useIsMobile();
  const active = Object.entries(f).filter(([k, v]) => k !== "sort" && (Array.isArray(v) ? v.length : v)).length;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  async function bulk(kind: "assign" | "priority", value: string) {
    if (!value || !selected.size) return;
    setBulkBusy(true);
    let ok = 0;
    const failures: string[] = [];
    for (const id of selected) {
      const row = rows.find((r) => r.id === id);
      try {
        await unwrap(
          fetch(kind === "assign" ? `/api/requests/${id}/assignments` : `/api/requests/${id}`, {
            method: kind === "assign" ? "POST" : "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(kind === "assign" ? { officerId: value } : { priority: value }),
          }),
        );
        ok++;
      } catch (e) {
        failures.push(`${row?.refCode}: ${errorMessage(e)}`);
      }
    }
    setBulkBusy(false);
    setSelected(new Set());
    await qc.invalidateQueries({ queryKey: ["requests"] });
    if (ok) toast.success(`Updated ${ok} request${ok > 1 ? "s" : ""}`);
    if (failures.length)
      toast.error(`${failures.length} could not be updated`, { description: failures.slice(0, 3).join("\n") });
  }

  const filterControls = (
    <>
      <MultiFilter
        label="Status"
        value={f.status}
        onChange={(v) => void setF({ status: v.length ? v : null })}
        options={REQUEST_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
      />
      <MultiFilter
        label="Priority"
        value={f.priority}
        onChange={(v) => void setF({ priority: v.length ? v : null })}
        options={REQUEST_PRIORITIES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))}
      />
      <NativeSelect
        aria-label="Category"
        value={f.category}
        onChange={(e) => void setF({ category: e.target.value || null })}
        className="h-9"
      >
        <NativeSelectOption value="">All categories</NativeSelectOption>
        {categories.data?.map((c) => (
          <NativeSelectOption key={c.id} value={c.slug}>
            {c.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Officer"
        value={f.assignee}
        onChange={(e) => void setF({ assignee: e.target.value || null })}
        className="h-9"
      >
        <NativeSelectOption value="">Any officer</NativeSelectOption>
        <NativeSelectOption value="none">Unassigned</NativeSelectOption>
        {officers.data?.data.map((o) => (
          <NativeSelectOption key={o.id} value={o.id}>
            {o.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="SLA"
        value={f.sla}
        onChange={(e) => void setF({ sla: e.target.value || null })}
        className="h-9"
      >
        <NativeSelectOption value="">Any SLA</NativeSelectOption>
        <NativeSelectOption value="breached">Overdue</NativeSelectOption>
        <NativeSelectOption value="at_risk">At risk</NativeSelectOption>
      </NativeSelect>
      <NativeSelect
        aria-label="Open or finished"
        value={f.open}
        onChange={(e) => void setF({ open: e.target.value || null })}
        className="h-9"
      >
        <NativeSelectOption value="">Open and finished</NativeSelectOption>
        <NativeSelectOption value="true">Open only</NativeSelectOption>
        <NativeSelectOption value="false">Finished only</NativeSelectOption>
      </NativeSelect>
      <div className="grid gap-1 md:contents">
        <Label htmlFor="filter-from" className="text-muted-foreground text-xs md:sr-only">
          From
        </Label>
        <Input
          id="filter-from"
          type="date"
          value={f.from}
          onChange={(e) => void setF({ from: e.target.value || null })}
          className="h-9 w-auto"
        />
      </div>
      <div className="grid gap-1 md:contents">
        <Label htmlFor="filter-to" className="text-muted-foreground text-xs md:sr-only">
          To
        </Label>
        <Input
          id="filter-to"
          type="date"
          value={f.to}
          onChange={(e) => void setF({ to: e.target.value || null })}
          className="h-9 w-auto"
        />
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={f.q}
            onChange={(e) => void setF({ q: e.target.value || null })}
            placeholder="Search title, description or ZG-…"
            className="h-9 pl-8"
            aria-label="Search requests"
          />
        </div>
        {mobile ? (
          <Button variant="outline" className="h-10 flex-1" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal data-icon="inline-start" /> Filters
            {active > (f.q ? 1 : 0) ? ` (${active - (f.q ? 1 : 0)})` : ""}
          </Button>
        ) : (
          filterControls
        )}
        {active > 0 && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => void setF(null)}>
            <X data-icon="inline-start" /> Reset ({active})
          </Button>
        )}
      </div>

      {mobile && (
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]"
          >
            <SheetHeader className="text-left">
              <SheetTitle>Filter requests</SheetTitle>
            </SheetHeader>
            <div className="grid gap-3 px-4 [&_button]:h-11 [&_input]:h-11 [&_input]:w-full [&_select]:h-11 [&>*]:w-full">
              {filterControls}
            </div>
            <SheetFooter className="flex-row gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={() =>
                  void setF({
                    status: null,
                    priority: null,
                    category: null,
                    assignee: null,
                    sla: null,
                    open: null,
                    from: null,
                    to: null,
                  })
                }
              >
                Clear
              </Button>
              <Button className="h-11 flex-1" onClick={() => setFiltersOpen(false)}>
                Show {total} result{total === 1 ? "" : "s"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          {selected.size > 0 ? (
            <>
              <span className="text-foreground font-medium">{selected.size} selected</span>
              <NativeSelect
                aria-label="Assign selected"
                disabled={bulkBusy}
                value=""
                onChange={(e) => void bulk("assign", e.target.value)}
                className="h-8"
              >
                <NativeSelectOption value="">Assign to…</NativeSelectOption>
                {officers.data?.data.map((o) => (
                  <NativeSelectOption key={o.id} value={o.id}>
                    {o.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                aria-label="Set priority of selected"
                disabled={bulkBusy}
                value=""
                onChange={(e) => void bulk("priority", e.target.value)}
                className="h-8"
              >
                <NativeSelectOption value="">Set priority…</NativeSelectOption>
                {REQUEST_PRIORITIES.map((p) => (
                  <NativeSelectOption key={p} value={p}>
                    {p[0].toUpperCase() + p.slice(1)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {bulkBusy && <Loader2 className="size-4 animate-spin" />}
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </>
          ) : (
            <span>
              {total} request{total === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect
            aria-label="Sort"
            value={f.sort}
            onChange={(e) => void setF({ sort: e.target.value as (typeof SORTS)[number] })}
            className="h-8"
          >
            <NativeSelectOption value="newest">Newest first</NativeSelectOption>
            <NativeSelectOption value="oldest">Oldest first</NativeSelectOption>
            <NativeSelectOption value="priority">Highest priority</NativeSelectOption>
            <NativeSelectOption value="due">Due soonest</NativeSelectOption>
          </NativeSelect>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/exports/requests.csv${toQuery(params)}`} download>
              <Download data-icon="inline-start" /> Export CSV
            </a>
          </Button>
        </div>
      </div>

      <ResponsiveList
        items={list.isPending ? [] : rows}
        empty={
          list.isPending ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground bg-card rounded-xl border p-6 text-center text-sm">
              No requests match these filters.
            </p>
          )
        }
        table={
          <div className="bg-card overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      aria-label="Select all on this page"
                      checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                      onCheckedChange={(v) => setSelected(v ? new Set(rows.map((r) => r.id)) : new Set())}
                    />
                  </TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead className="pr-4 text-right">Reported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isPending
                  ? Array.from({ length: 8 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  : rows.map((r) => (
                      <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                        <TableCell className="pl-4">
                          <Checkbox
                            aria-label={`Select ${r.refCode}`}
                            checked={selected.has(r.id)}
                            onCheckedChange={() => toggle(r.id)}
                          />
                        </TableCell>
                        <TableCell className="max-w-80">
                          <Link href={`/dashboard/requests/${r.refCode}`} className="group flex items-center gap-2">
                            <CategoryIcon icon={r.category.icon} className="text-muted-foreground size-4 shrink-0" />
                            <span className="min-w-0">
                              <span className="group-hover:text-primary block truncate font-medium">{r.title}</span>
                              <span className="text-muted-foreground block truncate text-xs">
                                <span className="font-mono">{r.refCode}</span> · {r.location.label}
                              </span>
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={r.priority} />
                        </TableCell>
                        <TableCell>
                          <SlaBadge state={r.sla.resolution} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.assignee?.name ?? <span className="text-muted-foreground">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-sm">{r.requester.name}</TableCell>
                        <TableCell className="text-muted-foreground pr-4 text-right text-xs whitespace-nowrap">
                          {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                {!list.isPending && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                      No requests match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        }
        card={(r) => (
          <li key={r.id} className={cn("bg-card rounded-xl border p-4", selected.has(r.id) && "border-primary")}>
            <div className="flex items-start gap-3">
              <Checkbox
                aria-label={`Select ${r.refCode}`}
                checked={selected.has(r.id)}
                onCheckedChange={() => toggle(r.id)}
                className="mt-1 size-5"
              />
              <Link href={`/dashboard/requests/${r.refCode}`} className="min-w-0 flex-1">
                <span className="block font-medium">{r.title}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  <span className="font-mono">{r.refCode}</span> · {r.location.label}
                </span>
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <StatusBadge status={r.status} />
              <PriorityBadge priority={r.priority} />
              <SlaBadge state={r.sla.resolution} />
            </div>
            <div className="text-muted-foreground mt-3 flex items-center justify-between border-t pt-3 text-xs">
              <span>{r.assignee?.name ?? "Unassigned"}</span>
              <span>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
            </div>
          </li>
        )}
      />

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Load more ({rows.length} of {total})
          </Button>
        </div>
      )}
    </div>
  );
}
