"use client";

import Link from "next/link";

import { ClipboardList, Loader2, Search } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import { RequestRow } from "@/components/requests/request-row";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounced } from "@/hooks/use-debounced";
import { useCategories, useRequestList } from "@/lib/queries";

const TABS = ["open", "done", "all"] as const;

export function MyRequests() {
  // Filters live in the URL, so views can be bookmarked and survive back/forward navigation.
  const [state, setState] = useQueryStates({
    tab: parseAsStringLiteral(TABS).withDefault("open"),
    q: parseAsString.withDefault(""),
    category: parseAsString.withDefault(""),
  });
  const q = useDebounced(state.q);
  const categories = useCategories();
  const list = useRequestList({
    scope: "mine",
    open: state.tab === "open" ? "true" : state.tab === "done" ? "false" : undefined,
    q: q || undefined,
    category: state.category || undefined,
    limit: 15,
  });
  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.pageInfo.total ?? 0;
  const awaiting = rows.filter((r) => r.status === "resolved");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={state.tab} onValueChange={(v) => void setState({ tab: v as (typeof TABS)[number] })}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="done">Finished</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={state.q}
              onChange={(e) => void setState({ q: e.target.value || null })}
              placeholder="Search title or ZG-…"
              className="h-9 pl-8"
              aria-label="Search your requests"
            />
          </div>
          <NativeSelect
            aria-label="Filter by category"
            value={state.category}
            onChange={(e) => void setState({ category: e.target.value || null })}
            className="h-9"
          >
            <NativeSelectOption value="">All categories</NativeSelectOption>
            {categories.data?.map((c) => (
              <NativeSelectOption key={c.id} value={c.slug}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {awaiting.length > 0 && state.tab !== "done" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-200">
          <strong>{awaiting.length}</strong> request{awaiting.length > 1 ? "s are" : " is"} marked resolved and waiting
          for you to confirm the fix.
        </div>
      )}

      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>
              {state.q || state.category
                ? "No matching requests"
                : state.tab === "open"
                  ? "Nothing open right now"
                  : "No requests yet"}
            </EmptyTitle>
            <EmptyDescription>
              {state.q || state.category
                ? "Try a different search or filter."
                : "When something on campus needs fixing, report it here."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/dashboard/requests/new">Report an issue</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="bg-card divide-y rounded-xl border">
            {rows.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </div>
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>
              Showing {rows.length} of {total}
            </span>
            {list.hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void list.fetchNextPage()}
                disabled={list.isFetchingNextPage}
              >
                {list.isFetchingNextPage && <Loader2 className="animate-spin" data-icon="inline-start" />}
                Load more
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
