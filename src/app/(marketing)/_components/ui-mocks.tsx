"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";
import { Check, Clock, MapPin, Star, Wrench } from "lucide-react";

import { AppLogo } from "@/components/app-logo";

/** Cycles 0..steps-1 every `ms`. Freezes on the last step when the user prefers reduced motion. */
function useTick(steps: number, ms = 1600) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTick(steps - 1);
      return;
    }
    const id = window.setInterval(() => setTick((t) => (t + 1) % steps), ms);
    return () => window.clearInterval(id);
  }, [steps, ms]);
  return tick;
}

const STATUS_STYLES = {
  Submitted: "bg-muted text-muted-foreground",
  Assigned: "bg-secondary text-secondary-foreground",
  "In progress": "bg-warning/20 text-warning-foreground dark:text-warning",
  Resolved: "bg-success/15 text-success",
} as const;

type Status = keyof typeof STATUS_STYLES;

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-background flex h-full w-full overflow-hidden text-left", className)}>{children}</div>;
}

/* ---------------------------------------------------------------- hero */

const HERO_ROWS: { ref: string; title: string; place: string; flow: Status[] }[] = [
  {
    ref: "ZG-26-000412",
    title: "Leaking pipe in shower block",
    place: "Hostel B, Floor 2",
    flow: ["Submitted", "Assigned", "In progress", "Resolved"],
  },
  {
    ref: "ZG-26-000409",
    title: "Projector not powering on",
    place: "Lecture Theatre 3",
    flow: ["Assigned", "In progress", "Resolved", "Resolved"],
  },
  {
    ref: "ZG-26-000405",
    title: "Wi-Fi down on third floor",
    place: "Library",
    flow: ["In progress", "In progress", "Resolved", "Resolved"],
  },
  {
    ref: "ZG-26-000398",
    title: "Broken chair, row 4",
    place: "Room 104, Science Block",
    flow: ["Submitted", "Submitted", "Assigned", "In progress"],
  },
];

export function HeroMock() {
  const t = useTick(4, 1800);
  const resolved = HERO_ROWS.filter((r) => r.flow[t] === "Resolved").length;
  return (
    <Shell>
      <aside className="bg-sidebar text-sidebar-foreground hidden w-[22%] flex-col gap-2 p-3 sm:flex">
        <AppLogo className="text-sidebar-primary mb-2 size-5" />
        {["Dashboard", "All requests", "Work orders", "Reports", "Audit trail"].map((item, i) => (
          <div
            key={item}
            className={cn("rounded-md px-2 py-1 text-[10px]", i === 1 ? "bg-sidebar-accent text-white" : "opacity-70")}
          >
            {item}
          </div>
        ))}
      </aside>
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Open", value: 4 - resolved },
            { label: "Resolved today", value: 12 + resolved },
            { label: "SLA met", value: `${94 + resolved}%` },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card rounded-lg border p-2">
              <div className="text-muted-foreground text-[9px]">{kpi.label}</div>
              <div className="text-sm font-semibold tabular-nums">{kpi.value}</div>
            </div>
          ))}
        </div>
        <div className="bg-card flex-1 rounded-lg border">
          {HERO_ROWS.map((row) => (
            <div key={row.ref} className="flex items-center gap-2 border-b px-3 py-2 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium">{row.title}</div>
                <div className="text-muted-foreground flex items-center gap-1 text-[9px]">
                  <span className="font-mono">{row.ref}</span>
                  <MapPin className="size-2.5" />
                  <span className="truncate">{row.place}</span>
                </div>
              </div>
              <StatusPill status={row.flow[t]} />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

/* ---------------------------------------------------------------- step: report */

const TIMELINE = [
  "Submitted",
  "Assigned to Chinedu O.",
  "Work started",
  "Resolved with after-photo",
  "Confirmed by requester",
];

export function ResolveMock() {
  const t = useTick(TIMELINE.length + 1, 1100);
  return (
    <Shell className="flex-col justify-center gap-4 p-5">
      <ol className="space-y-2.5">
        {TIMELINE.map((step, i) => (
          <li
            key={step}
            className={cn("flex items-center gap-2 text-[10px] transition-opacity", i > t && "opacity-30")}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full border",
                i <= t ? "border-primary bg-primary text-primary-foreground" : "",
              )}
            >
              {i <= t && <Check className="size-2.5" />}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="bg-card flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3">
        <div className="text-[10px] font-medium">How did we do?</div>
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((s) => (
            <Star
              key={s}
              className={cn(
                "size-3.5 transition-colors",
                t >= TIMELINE.length - 1 && s <= Math.min(4, t - 1)
                  ? "fill-warning text-warning"
                  : "text-muted-foreground/40",
              )}
            />
          ))}
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-[9px]">
          <Clock className="size-2.5" /> Resolved in 3h 12m
        </div>
      </div>
    </Shell>
  );
}

/* ---------------------------------------------------------------- roles */

export function TrackMock() {
  return <ResolveMock />;
}

const BOARD: { col: Status; cards: string[] }[] = [
  { col: "Assigned", cards: ["Faulty socket, Room 12", "Door hinge, Hostel A"] },
  { col: "In progress", cards: ["Leaking pipe, Hostel B"] },
  { col: "Resolved", cards: ["Ceiling fan, Lab 2"] },
];

export function BoardMock() {
  const t = useTick(3, 1700);
  const moved = t >= 1;
  const done = t >= 2;
  return (
    <Shell className="gap-2 p-3">
      {BOARD.map(({ col, cards }) => {
        let list = [...cards];
        if (col === "Assigned" && moved) list = list.slice(1);
        if (col === "In progress" && moved && !done) list = ["Faulty socket, Room 12", ...list];
        if (col === "In progress" && done) list = ["Faulty socket, Room 12"];
        if (col === "Resolved" && done) list = ["Leaking pipe, Hostel B", ...list];
        return (
          <div key={col} className="bg-muted/50 flex flex-1 flex-col gap-1.5 rounded-lg p-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-medium">{col}</span>
              <span className="text-muted-foreground text-[9px] tabular-nums">{list.length}</span>
            </div>
            {list.map((card) => (
              <div
                key={card}
                className="bg-card animate-in fade-in zoom-in-95 rounded-md border p-1.5 text-[9px] shadow-xs"
              >
                <div className="font-medium">{card}</div>
                <div className="mt-1 flex items-center justify-between">
                  <Wrench className="text-muted-foreground size-2.5" />
                  <StatusPill status={col} />
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </Shell>
  );
}

const BARS = [40, 62, 48, 75, 58, 82, 70];

export function AdminMock() {
  const t = useTick(2, 2200);
  return (
    <Shell className="flex-col gap-2 p-3">
      <div className="grid grid-cols-4 gap-1.5">
        {[
          ["Requests", "1,284"],
          ["Avg. resolution", "6.4h"],
          ["SLA met", "95%"],
          ["Satisfaction", "4.7★"],
        ].map(([label, value]) => (
          <div key={label} className="bg-card rounded-md border p-1.5">
            <div className="text-muted-foreground text-[8px]">{label}</div>
            <div className="text-xs font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <div className="bg-card flex flex-1 items-end gap-1.5 rounded-md border p-2">
        {BARS.map((h, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static decorative bars
            key={i}
            className="bg-primary/80 flex-1 rounded-t transition-all duration-700"
            style={{ height: `${t ? h : Math.max(20, h - 25)}%` }}
          />
        ))}
      </div>
    </Shell>
  );
}
