"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { unwrap } from "@/lib/api-client";
import { errorMessage } from "@/lib/queries";

/** Email opt-out. In-app notifications and live updates are always on. */
export function EmailPreferencesCard() {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap<{ emailNotifications: boolean }>(fetch("/api/me", { credentials: "include" })),
  });
  const save = useMutation({
    mutationFn: (emailNotifications: boolean) =>
      unwrap<{ emailNotifications: boolean }>(
        fetch("/api/me", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailNotifications }),
        }),
      ),
    onSuccess: (d) => {
      qc.setQueryData(["me"], (old: object | undefined) => ({ ...old, ...d }));
      toast.success(d.emailNotifications ? "Email notifications on" : "Email notifications off");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          In-app notifications are always on. Choose whether important updates are also emailed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <Label htmlFor="email-notifications" className="flex flex-col items-start gap-1 font-normal">
            <span className="font-medium">Email me about important updates</span>
            <span className="text-muted-foreground text-xs">
              New jobs, resolved requests, rejections, reopenings and SLA breaches.
            </span>
          </Label>
          <Switch
            id="email-notifications"
            checked={me.data?.emailNotifications ?? true}
            disabled={me.isPending || save.isPending}
            onCheckedChange={(v) => save.mutate(v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
