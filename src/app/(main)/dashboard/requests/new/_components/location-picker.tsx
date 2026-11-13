"use client";

import { useMemo, useState } from "react";

import { cn } from "cn";
import { Building2, Check, DoorOpen, Hotel, MapPin, Search, Trees } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { LocationOption } from "@/lib/queries";

const KIND_ICON = {
  building: Building2,
  hostel: Hotel,
  room: DoorOpen,
  floor: Building2,
  outdoor: Trees,
  campus: MapPin,
} as const;

/** Searchable list of campus places, grouped by building or hostel. Rooms and outdoor spaces are selectable. */
export function LocationPicker({
  locations,
  loading,
  value,
  onChange,
}: {
  locations: LocationOption[] | undefined;
  loading: boolean;
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    if (!locations) return [];
    const byId = new Map(locations.map((l) => [l.id, l]));
    const topOf = (l: LocationOption): LocationOption => {
      let cur = l;
      while (cur.parentId && byId.get(cur.parentId)?.kind !== "campus") cur = byId.get(cur.parentId) ?? cur;
      return cur;
    };
    const parents = new Set(locations.map((l) => l.parentId).filter(Boolean));
    const selectable = locations.filter((l) => l.kind !== "campus" && !parents.has(l.id));
    const q = query.trim().toLowerCase();
    const matches = q ? selectable.filter((l) => `${l.label} ${l.code}`.toLowerCase().includes(q)) : selectable;
    const map = new Map<string, { top: LocationOption; items: LocationOption[] }>();
    for (const l of matches) {
      const top = topOf(l);
      const g = map.get(top.id) ?? { top, items: [] };
      g.items.push(l);
      map.set(top.id, g);
    }
    return [...map.values()];
  }, [locations, query]);

  if (loading) return <Skeleton className="h-72" />;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a building, hostel or room…"
          className="h-10 pl-9"
          aria-label="Search locations"
        />
      </div>
      <div className="max-h-80 overflow-y-auto rounded-xl border" role="listbox" aria-label="Locations">
        {groups.length === 0 && <p className="text-muted-foreground p-4 text-sm">No places match “{query}”.</p>}
        {groups.map(({ top, items }) => {
          const TopIcon = KIND_ICON[top.kind as keyof typeof KIND_ICON] ?? MapPin;
          return (
            <div key={top.id}>
              <div className="bg-muted/60 text-muted-foreground sticky top-0 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase backdrop-blur">
                <TopIcon className="size-3.5" /> {top.name}
              </div>
              {items.map((l) => {
                const active = value === l.id;
                const sub = l.label.split(" › ").slice(1).join(" › ") || l.name;
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => onChange(l.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      active ? "bg-accent font-medium" : "hover:bg-muted",
                    )}
                  >
                    <span className="flex-1">{sub}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">{l.code}</span>
                    {active && <Check className="text-primary size-4" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
