"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { ChevronDown, Columns3, List, Loader2, Search, Wrench } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { toast } from "sonner";

import { RequestRow } from "@/components/requests/request-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { REQUEST_PRIORITIES, type RequestStatus, STATUS_LABELS } from "@/domain/constants";
import { checkTransition, TRANSITIONS } from "@/domain/request-machine";
import { useDebounced } from "@/hooks/use-debounced";
import { unwrap } from "@/lib/api-client";
import { errorMessage, type RequestDetail, type RequestSummary, useRequestList } from "@/lib/queries";

import { JobCard } from "./job-card";

const COLUMNS: { status: RequestStatus; hint: string }[] = [
  { status: "assigned", hint: "New jobs for you" },
  { status: "in_progress", hint: "Being worked on" },
  { status: "on_hold", hint: "Waiting on parts or access" },
  { status: "resolved", hint: "Waiting for the requester to confirm" },
];
const BOARD_STATUSES = ["assigned", "reopened", "in_progress", "on_hold", "resolved"];

type Pending = { job: RequestSummary; to: RequestStatus; label: string };

export function WorkBoard({ officerId }: { officerId: string }) {
  const qc = useQueryClient();
  const [state, setState] = useQueryStates({
    view: parseAsStringLiteral(["board", "list"] as const).withDefault("board"),
    q: parseAsString.withDefault(""),
    priority: parseAsString.withDefault(""),
  });
  const q = useDebounced(state.q);
  const list = useRequestList({
    assignee: "me",
    status: BOARD_STATUSES,
    sort: "due",
    limit: 100,
    q: q || undefined,
    priority: state.priority || undefined,
  });
  const jobs = useMemo(() => list.data?.pages.flatMap((p) => p.data) ?? [], [list.data]);
  const [overrides, setOverrides] = useState<Record<string, RequestStatus>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const statusOf = (j: RequestSummary): RequestStatus => {
    const s = overrides[j.id] ?? j.status;
    return s === "reopened" ? "assigned" : s;
  };

  async function move(job: RequestSummary, to: RequestStatus, withNote?: string) {
    setOverrides((o) => ({ ...o, [job.id]: to })); // optimistic
    try {
      await unwrap<RequestDetail>(
        fetch(`/api/requests/${job.id}/transitions`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, note: withNote }),
        }),
      );
      toast.success(`${job.refCode} moved to ${STATUS_LABELS[to]}`);
      await qc.invalidateQueries({ queryKey: ["requests"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setOverrides((o) => {
        const { [job.id]: _, ...rest } = o;
        return rest;
      });
    }
  }

  /** Board columns this officer may move a job to (the "Move to" menu: tap and keyboard alternative to dragging). */
  function allowedMoves(job: RequestSummary): RequestStatus[] {
    const ctx = {
      status: job.status,
      userId: officerId,
      role: "officer" as const,
      requesterId: job.requester.id,
      assigneeId: job.assignee?.id ?? null,
    };
    return COLUMNS.map((c) => c.status).filter((to) => to !== statusOf(job) && checkTransition(ctx, to, "x").ok);
  }

  /** Uses the same state machine as the server to accept or reject a drop before any request is made. */
  function onDrop(jobId: string, target: RequestStatus) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || statusOf(job) === target) return;
    const ctx = {
      status: job.status,
      userId: officerId,
      role: "officer" as const,
      requesterId: job.requester.id,
      assigneeId: job.assignee?.id ?? null,
    };
    const check = checkTransition(ctx, target, "placeholder");
    if (!check.ok) {
      const allowed = TRANSITIONS[job.status]
        .filter((t) => checkTransition(ctx, t.to, "x").ok)
        .map((t) => STATUS_LABELS[t.to]);
      toast.error(
        `${STATUS_LABELS[job.status]} jobs can't move to ${STATUS_LABELS[target]}.${allowed.length ? ` Try: ${allowed.join(", ")}.` : ""}`,
      );
      return;
    }
    if (check.rule.requiresNote) {
      setNote("");
      setPending({ job, to: target, label: check.rule.label });
      return;
    }
    void move(job, target);
  }

  async function confirmPending() {
    if (!pending || !note.trim()) return;
    setSaving(true);
    await move(pending.job, pending.to, note.trim());
    setSaving(false);
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={state.q}
              onChange={(e) => void setState({ q: e.target.value || null })}
              placeholder="Search jobs…"
              className="h-9 pl-8"
              aria-label="Search jobs"
            />
          </div>
          <NativeSelect
            aria-label="Priority"
            value={state.priority}
            onChange={(e) => void setState({ priority: e.target.value || null })}
            className="h-9"
          >
            <NativeSelectOption value="">Any priority</NativeSelectOption>
            {REQUEST_PRIORITIES.map((p) => (
              <NativeSelectOption key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={state.view}
          onValueChange={(v) => v && void setState({ view: v as "board" | "list" })}
          aria-label="View"
        >
          <ToggleGroupItem value="board" className="px-3">
            <Columns3 className="size-4" /> Board
          </ToggleGroupItem>
          <ToggleGroupItem value="list" className="px-3">
            <List className="size-4" /> List
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {list.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((c) => (
            <Skeleton key={c.status} className="h-72" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wrench />
            </EmptyMedia>
            <EmptyTitle>No jobs right now</EmptyTitle>
            <EmptyDescription>New assignments will appear here, and you will get a notification.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : state.view === "list" ? (
        <div className="bg-card divide-y rounded-xl border">
          {jobs.map((j) => (
            <RequestRow key={j.id} request={{ ...j, status: statusOf(j) }} />
          ))}
        </div>
      ) : (
        <DragDropProvider
          onDragEnd={(event) => {
            const { source, target } = event.operation;
            if (event.canceled || !source || !target) return;
            onDrop(String(source.id), String(target.id) as RequestStatus);
          }}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const items = jobs.filter((j) => statusOf(j) === col.status);
              return (
                <Column key={col.status} status={col.status} hint={col.hint} count={items.length}>
                  {items.map((j) => (
                    <DraggableJob
                      key={j.id}
                      job={j}
                      now={now}
                      disabled={col.status === "resolved"}
                      moves={allowedMoves(j)}
                      onMove={(to) => onDrop(j.id, to)}
                    />
                  ))}
                </Column>
              );
            })}
          </div>
        </DragDropProvider>
      )}

      <Dialog open={pending !== null} onOpenChange={(v) => !v && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.label}</DialogTitle>
            <DialogDescription>
              {pending?.job.refCode}: {pending?.job.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="move-note">
              {pending?.to === "resolved" ? "What did you do to fix it?" : "What is it waiting for?"}
            </Label>
            <Textarea
              id="move-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              autoFocus
            />
            {pending?.to === "resolved" && (
              <p className="text-muted-foreground text-xs">
                Tip: add an &ldquo;after&rdquo; photo on the job page so the requester can see the fix.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={confirmPending} disabled={!note.trim() || saving}>
              {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {pending?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Column({
  status,
  hint,
  count,
  children,
}: {
  status: RequestStatus;
  hint: string;
  count: number;
  children: ReactNode;
}) {
  const { ref, isDropTarget } = useDroppable({ id: status });
  return (
    <section
      ref={ref}
      aria-label={`${STATUS_LABELS[status]} (${count})`}
      className={cn(
        "bg-muted/40 flex min-h-64 flex-col gap-2 rounded-xl border p-2 transition-colors",
        isDropTarget && "bg-accent border-primary",
      )}
    >
      <header className="flex items-baseline justify-between px-1 pt-1">
        <h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">{count}</span>
      </header>
      <p className="text-muted-foreground px-1 text-xs">{hint}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function DraggableJob({
  job,
  now,
  disabled,
  moves,
  onMove,
}: {
  job: RequestSummary;
  now: number;
  disabled: boolean;
  moves: RequestStatus[];
  onMove: (to: RequestStatus) => void;
}) {
  const { ref, isDragging } = useDraggable({ id: job.id, disabled });
  return (
    <div
      ref={ref}
      className={cn("touch-none", !disabled && "cursor-grab active:cursor-grabbing", isDragging && "opacity-60")}
    >
      <JobCard
        job={job}
        now={now}
        dragging={isDragging}
        action={
          moves.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="xs"
                  className="-mr-1 h-6"
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={`Move ${job.refCode}`}
                >
                  Move <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {moves.map((to) => (
                  <DropdownMenuItem key={to} onSelect={() => onMove(to)}>
                    {STATUS_LABELS[to]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />
    </div>
  );
}
