"use client";

import { useEffect, useRef } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { unwrap } from "@/lib/api-client";
import { keys } from "@/lib/queries";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  requestId: string | null;
  refCode: string | null;
  readAt: string | null;
  createdAt: string;
};
type Page = { data: NotificationItem[]; unread: number };

export const markRead = (ids: string[] | "all") =>
  unwrap<{ unread: number }>(
    fetch("/api/notifications/read", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }),
  );

export function useNotifications(limit = 8) {
  return useQuery({
    queryKey: [...keys.notifications, limit],
    queryFn: () => unwrap<Page>(fetch(`/api/notifications?limit=${limit}`, { credentials: "include" })),
    refetchInterval: 120_000,
  });
}

/** Header bell: unread badge, latest notifications, and a toast when a new one arrives live. */
export function NotificationBell() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data } = useNotifications();
  const seen = useRef<string | null>(null);
  const read = useMutation({
    mutationFn: markRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.notifications }),
  });

  // Toast genuinely new notifications (not the ones already there on first load).
  useEffect(() => {
    const newest = data?.data[0];
    if (!newest) return;
    if (seen.current && seen.current !== newest.id && !newest.readAt) {
      toast(newest.title, {
        description: newest.body,
        action: newest.refCode
          ? { label: "View", onClick: () => router.push(`/dashboard/requests/${newest.refCode}`) }
          : undefined,
      });
    }
    seen.current = newest.id;
  }, [data, router]);

  const unread = data?.unread ?? 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell />
          {unread > 0 && (
            <span className="bg-destructive absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white tabular-nums">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          <Button variant="ghost" size="xs" disabled={!unread || read.isPending} onClick={() => read.mutate("all")}>
            <CheckCheck data-icon="inline-start" /> Mark all read
          </Button>
        </div>
        <ul className="max-h-96 divide-y overflow-y-auto">
          {data?.data.length ? (
            data.data.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.refCode ? `/dashboard/requests/${n.refCode}` : "/dashboard/notifications"}
                  onClick={() => !n.readAt && read.mutate([n.id])}
                  className={cn("hover:bg-muted/60 flex gap-3 px-4 py-3", !n.readAt && "bg-accent/40")}
                >
                  <span
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{n.title}</span>
                    <span className="text-muted-foreground line-clamp-2 block text-xs">{n.body}</span>
                    <span className="text-muted-foreground mt-1 block text-[11px]">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground px-4 py-8 text-center text-sm">You are all caught up.</li>
          )}
        </ul>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/dashboard/notifications">See all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
