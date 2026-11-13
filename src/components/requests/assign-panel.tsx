"use client";

import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { BadgeCheck, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { REQUEST_PRIORITIES, type RequestPriority } from "@/domain/constants";
import { unwrap } from "@/lib/api-client";
import { errorMessage, keys, type OfficerSuggestion, type RequestDetail, useRequest } from "@/lib/queries";

/** Admin-only: smart assignment (officers ranked by specialty and workload) and priority changes. */
export function AssignPanel({ initial }: { initial: RequestDetail }) {
  const qc = useQueryClient();
  const { data: request = initial } = useRequest(initial.refCode, initial);
  const [open, setOpen] = useState(!request.assignee && request.can.assign);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const suggestions = useQuery({
    queryKey: ["requests", "suggestions", request.id, request.assignee?.id],
    queryFn: () =>
      unwrap<OfficerSuggestion[]>(fetch(`/api/requests/${request.id}/suggestions`, { credentials: "include" })),
    enabled: open && request.can.assign,
  });

  const refresh = (data: RequestDetail) => {
    qc.setQueryData(keys.detail(request.refCode), data);
    void qc.invalidateQueries({ queryKey: keys.timeline(request.refCode) });
    void qc.invalidateQueries({ queryKey: [...keys.requests, "list"] });
  };

  async function assign(o: OfficerSuggestion) {
    setBusy(o.officer.id);
    try {
      const data = await unwrap<RequestDetail>(
        fetch(`/api/requests/${request.id}/assignments`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ officerId: o.officer.id, note: note.trim() || undefined }),
        }),
      );
      refresh(data);
      toast.success(`Assigned to ${o.officer.name}`);
      setOpen(false);
      setNote("");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function setPriority(priority: RequestPriority) {
    try {
      const data = await unwrap<RequestDetail>(
        fetch(`/api/requests/${request.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority }),
        }),
      );
      refresh(data);
      toast.success(`Priority set to ${priority}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Card className={cn(!request.assignee && request.can.assign && "border-primary/50")}>
      <CardHeader>
        <CardTitle className="text-base">Assignment</CardTitle>
        <CardDescription>
          {request.assignee ? (
            <>
              Assigned to <span className="text-foreground font-medium">{request.assignee.name}</span>
            </>
          ) : (
            "No officer assigned yet."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {request.can.edit && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <label htmlFor="priority" className="text-muted-foreground">
              Priority
            </label>
            <NativeSelect
              id="priority"
              value={request.priority}
              onChange={(e) => void setPriority(e.target.value as RequestPriority)}
              className="h-8"
            >
              {REQUEST_PRIORITIES.map((p) => (
                <NativeSelectOption key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}

        {request.can.assign &&
          (open ? (
            <div className="space-y-3">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note for the officer (optional)"
                maxLength={500}
                className="h-8"
              />
              <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Suggested officers
              </div>
              {suggestions.isPending ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-2">
                  {suggestions.data?.map((o, i) => (
                    <li
                      key={o.officer.id}
                      className={cn("rounded-lg border p-3", i === 0 && "border-primary/40 bg-accent/50")}
                    >
                      <div className="flex items-center gap-2">
                        <UserAvatar id={o.officer.id} userRole="officer" name={o.officer.name} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            {o.officer.name}
                            {o.specialist && <BadgeCheck className="text-primary size-4" aria-label="Specialist" />}
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            {o.specialties.join(", ") || "General"} · {o.openJobs} open job{o.openJobs === 1 ? "" : "s"}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={i === 0 ? "default" : "outline"}
                          disabled={busy !== null}
                          onClick={() => void assign(o)}
                          aria-label={`Assign ${o.officer.name}`}
                        >
                          {busy === o.officer.id ? <Loader2 className="animate-spin" /> : "Assign"}
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${o.score}%` }} />
                        </div>
                        <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                          {o.score}% fit
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {request.assignee && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              )}
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
              <UserPlus data-icon="inline-start" /> {request.assignee ? "Reassign" : "Assign an officer"}
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}
