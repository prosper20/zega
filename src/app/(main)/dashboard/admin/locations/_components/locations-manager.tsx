"use client";

import { useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import {
  Building2,
  DoorOpen,
  Hotel,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Printer,
  QrCode,
  Search,
  Trees,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { unwrap } from "@/lib/api-client";
import { errorMessage, keys, type LocationOption, useLocations } from "@/lib/queries";

const KIND_ICON = {
  campus: MapPin,
  building: Building2,
  hostel: Hotel,
  floor: Layers,
  room: DoorOpen,
  outdoor: Trees,
} as const;
const KINDS = ["building", "hostel", "floor", "room", "outdoor"] as const;

export function LocationsManager() {
  const qc = useQueryClient();
  const locations = useLocations();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const all = locations.data ?? [];
  const depth = (l: LocationOption) => l.path.split(".").length - 1;
  const childrenOf = useMemo(() => {
    const m = new Map<string, LocationOption[]>();
    for (const l of all) if (l.parentId) m.set(l.parentId, [...(m.get(l.parentId) ?? []), l]);
    return m;
  }, [all]);
  const q = query.trim().toLowerCase();
  const visible = q ? all.filter((l) => `${l.label} ${l.code}`.toLowerCase().includes(q)) : all;

  const toggleTree = (l: LocationOption, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      const walk = (x: LocationOption) => {
        on ? n.add(x.id) : n.delete(x.id);
        for (const c of childrenOf.get(x.id) ?? []) walk(c);
      };
      walk(l);
      return n;
    });

  const printable = [...selected].filter((id) => all.find((l) => l.id === id)?.kind !== "campus");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places or codes"
            className="h-9 pl-8"
            aria-label="Search locations"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9" onClick={() => setAdding(true)}>
            <Plus data-icon="inline-start" /> Add location
          </Button>
          <Button asChild className="h-9" disabled={!printable.length}>
            <a
              href={printable.length ? `/print/qr?ids=${printable.join(",")}` : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!printable.length}
            >
              <Printer data-icon="inline-start" /> Print {printable.length || ""} sticker
              {printable.length === 1 ? "" : "s"}
            </a>
          </Button>
        </div>
      </div>

      {locations.isPending ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="bg-card divide-y rounded-xl border">
          {visible.map((l) => {
            const Icon = KIND_ICON[l.kind as keyof typeof KIND_ICON] ?? MapPin;
            return (
              <div
                key={l.id}
                className={cn("flex items-center gap-3 py-2 pr-4", selected.has(l.id) && "bg-accent/40")}
                style={{ paddingLeft: q ? 16 : 16 + depth(l) * 22 }}
              >
                <Checkbox
                  aria-label={`Select ${l.label}`}
                  checked={selected.has(l.id)}
                  onCheckedChange={(v) => toggleTree(l, Boolean(v))}
                />
                <Icon className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-sm", depth(l) <= 1 && "font-medium")}>{q ? l.label : l.name}</div>
                </div>
                <span className="text-muted-foreground hidden font-mono text-xs sm:inline">{l.code}</span>
                {l.kind !== "campus" && (
                  <Button asChild variant="ghost" size="icon-sm" aria-label={`QR sticker for ${l.label}`}>
                    <a href={`/print/qr?ids=${l.id}`} target="_blank" rel="noreferrer">
                      <QrCode />
                    </a>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <AddLocationDialog
          locations={all}
          onClose={() => setAdding(false)}
          onSaved={() => void qc.invalidateQueries({ queryKey: keys.locations })}
        />
      )}
    </div>
  );
}

function AddLocationDialog({
  locations,
  onClose,
  onSaved,
}: {
  locations: LocationOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const parents = locations.filter((l) => l.kind !== "room");
  const [form, setForm] = useState({
    parentId: parents.find((p) => p.kind === "campus")?.id ?? "",
    name: "",
    code: "",
    kind: "room" as (typeof KINDS)[number],
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await unwrap(
        fetch("/api/locations", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, parentId: form.parentId || null }),
        }),
      );
      toast.success(`${form.name} added`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a location</DialogTitle>
          <DialogDescription>It gets its own QR sticker automatically.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="loc-parent">Inside</Label>
            <NativeSelect
              id="loc-parent"
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              className="w-full"
            >
              {parents.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>
                  {p.kind === "campus" ? p.name : p.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="loc-name">Name</Label>
              <Input
                id="loc-name"
                value={form.name}
                placeholder="Room 210"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="loc-kind">Type</Label>
              <NativeSelect
                id="loc-kind"
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as (typeof KINDS)[number] }))}
                className="w-full"
              >
                {KINDS.map((k) => (
                  <NativeSelectOption key={k} value={k}>
                    {k[0].toUpperCase() + k.slice(1)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="loc-code">Short code</Label>
            <Input
              id="loc-code"
              value={form.code}
              placeholder="SCI-210"
              className="font-mono uppercase"
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
            <p className="text-muted-foreground text-xs">Letters, numbers and dashes. Printed on the sticker.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || form.name.length < 2 || form.code.length < 2}>
            {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Add location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
