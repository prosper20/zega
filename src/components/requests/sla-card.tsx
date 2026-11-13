"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/domain/sla";
import type { RequestDetail } from "@/lib/queries";

import { SlaBadge } from "./badges";

function Row({ label, due, doneAt, now }: { label: string; due: string | null; doneAt: string | null; now: number }) {
  if (!due) return null;
  const dueMs = Date.parse(due);
  const text = doneAt
    ? `Done ${Date.parse(doneAt) <= dueMs ? "on time" : `${formatDuration(Date.parse(doneAt) - dueMs)} late`}`
    : dueMs >= now
      ? `${formatDuration(dueMs - now)} left`
      : `${formatDuration(now - dueMs)} overdue`;
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="block font-medium tabular-nums">{text}</span>
        <span className="text-muted-foreground text-xs">
          {new Date(due).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </span>
      </span>
    </div>
  );
}

/** Live countdowns to the response and resolution targets. */
export function SlaCard({ request }: { request: RequestDetail }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!request.resolutionDueAt) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Service targets</CardTitle>
        <SlaBadge state={request.sla.resolution} />
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label="First response" due={request.responseDueAt} doneAt={request.firstResponseAt} now={now} />
        <Row label="Resolution" due={request.resolutionDueAt} doneAt={request.resolvedAt} now={now} />
      </CardContent>
    </Card>
  );
}
