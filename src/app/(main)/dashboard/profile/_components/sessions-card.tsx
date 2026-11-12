"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDistanceToNow } from "date-fns";
import { Laptop, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

import { describeUserAgent, formatIp } from "./user-agent";

type SessionRow = {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  updatedAt: Date;
  createdAt: Date;
};

export function SessionsCard() {
  const { data: current } = authClient.useSession();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await authClient.listSessions();
    if (error) toast.error("Could not load your sessions.");
    setSessions((data ?? []) as SessionRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(token: string) {
    setBusy(token);
    const { error } = await authClient.revokeSession({ token });
    setBusy(null);
    if (error) return toast.error("Could not sign out that device.");
    toast.success("Device signed out");
    await load();
  }

  async function revokeOthers() {
    setBusy("others");
    const { error } = await authClient.revokeOtherSessions();
    setBusy(null);
    if (error) return toast.error("Could not sign out other devices.");
    toast.success("Signed out of all other devices");
    await load();
  }

  const currentToken = current?.session.token;
  const sorted = [...(sessions ?? [])].sort(
    (a, b) =>
      Number(b.token === currentToken) - Number(a.token === currentToken) ||
      +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>
          Devices currently signed in to your account. Sign out any you do not recognise.
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={revokeOthers}
            disabled={busy !== null || (sessions?.length ?? 0) < 2}
          >
            {busy === "others" && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Sign out others
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="divide-y">
        {sessions === null
          ? [0, 1].map((i) => <Skeleton key={i} className="my-3 h-12 w-full" />)
          : sorted.map((s) => {
              const ua = describeUserAgent(s.userAgent);
              const isCurrent = s.token === currentToken;
              const Icon = ua.mobile ? Smartphone : Laptop;
              return (
                <div key={s.id} className="flex items-center gap-3 py-3">
                  <div className="bg-muted flex size-9 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {ua.browser} on {ua.os}
                      {isCurrent && <Badge variant="secondary">This device</Badge>}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {formatIp(s.ipAddress)} · active {formatDistanceToNow(new Date(s.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                  {!isCurrent && (
                    <Button variant="ghost" size="sm" onClick={() => revoke(s.token)} disabled={busy !== null}>
                      {busy === s.token && <Loader2 className="animate-spin" data-icon="inline-start" />}
                      Sign out
                    </Button>
                  )}
                </div>
              );
            })}
      </CardContent>
    </Card>
  );
}
