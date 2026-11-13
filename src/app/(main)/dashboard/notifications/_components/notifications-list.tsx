"use client";

import Link from "next/link";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { format, formatDistanceToNow } from "date-fns";
import { AlarmClock, Bell, CheckCheck, CheckCircle2, Loader2, MessageSquare, UserCheck } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { markRead, type NotificationItem } from "@/components/live/notification-bell";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { unwrap } from "@/lib/api-client";
import { keys, toQuery } from "@/lib/queries";

const ICON: Record<string, typeof Bell> = {
  "request.assigned": UserCheck,
  "request.resolved": CheckCircle2,
  "request.comment": MessageSquare,
  "sla.breach": AlarmClock,
};

export function NotificationsList() {
  const qc = useQueryClient();
  const [tab, setTab] = useQueryState("show", parseAsStringLiteral(["all", "unread"] as const).withDefault("all"));
  const list = useInfiniteQuery({
    queryKey: [...keys.notifications, "page", tab],
    queryFn: ({ pageParam }) =>
      unwrap<{ data: NotificationItem[]; unread: number }>(
        fetch(
          `/api/notifications${toQuery({ unread: tab === "unread" ? "true" : undefined, before: pageParam, limit: 20 })}`,
          { credentials: "include" },
        ),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => (p.data.length === 20 ? p.data.at(-1)?.createdAt : undefined),
  });
  const read = useMutation({
    mutationFn: markRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.notifications }),
  });
  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];
  const unread = list.data?.pages[0]?.unread ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={tab} onValueChange={(v) => void setTab(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread {unread > 0 && `(${unread})`}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" disabled={!unread || read.isPending} onClick={() => read.mutate("all")}>
          <CheckCheck data-icon="inline-start" /> Mark all read
        </Button>
      </div>

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
              <Bell />
            </EmptyMedia>
            <EmptyTitle>{tab === "unread" ? "No unread notifications" : "No notifications yet"}</EmptyTitle>
            <EmptyDescription>You will be notified here when requests you are involved in change.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {rows.map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            return (
              <li key={n.id} className={cn("flex items-start gap-3 px-4 py-3", !n.readAt && "bg-accent/30")}>
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    n.readAt ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  {n.refCode ? (
                    <Link
                      href={`/dashboard/requests/${n.refCode}`}
                      onClick={() => !n.readAt && read.mutate([n.id])}
                      className="hover:text-primary text-sm font-medium"
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{n.title}</p>
                  )}
                  <p className="text-muted-foreground text-sm">{n.body}</p>
                  <time
                    className="text-muted-foreground text-xs"
                    dateTime={n.createdAt}
                    title={format(new Date(n.createdAt), "PPpp")}
                  >
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </time>
                </div>
                {!n.readAt && (
                  <Button variant="ghost" size="xs" onClick={() => read.mutate([n.id])}>
                    Mark read
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Load older
          </Button>
        </div>
      )}
    </div>
  );
}
