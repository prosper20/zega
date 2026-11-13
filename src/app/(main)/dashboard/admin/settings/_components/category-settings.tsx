"use client";

import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/requests/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { REQUEST_PRIORITIES, type RequestPriority } from "@/domain/constants";
import { unwrap } from "@/lib/api-client";
import { type Category, errorMessage, keys } from "@/lib/queries";

const toHours = (m: number) => Math.round((m / 60) * 100) / 100;

export function CategorySettings() {
  const categories = useQuery({
    queryKey: [...keys.categories, "all"],
    queryFn: () => unwrap<Category[]>(fetch("/api/categories?archived=true", { credentials: "include" })),
  });
  if (categories.isPending)
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    );
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {categories.data?.map((c) => (
        <CategoryCard key={c.id} category={c} />
      ))}
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const qc = useQueryClient();
  const initial = Object.fromEntries(
    REQUEST_PRIORITIES.map((p) => {
      const pol = category.sla.find((s) => s.priority === p);
      return [
        p,
        {
          response: pol ? String(toHours(pol.responseMinutes)) : "",
          resolution: pol ? String(toHours(pol.resolutionMinutes)) : "",
        },
      ];
    }),
  ) as Record<RequestPriority, { response: string; resolution: string }>;
  const [sla, setSla] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(sla) !== JSON.stringify(initial);
  const refresh = () => qc.invalidateQueries({ queryKey: keys.categories });

  async function patch(body: Record<string, unknown>, message: string) {
    try {
      await unwrap(
        fetch(`/api/categories/${category.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      toast.success(message);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function saveSla() {
    const policies = REQUEST_PRIORITIES.filter((p) => sla[p].response && sla[p].resolution).map((p) => ({
      priority: p,
      responseMinutes: Math.round(Number(sla[p].response) * 60),
      resolutionMinutes: Math.round(Number(sla[p].resolution) * 60),
    }));
    if (policies.some((p) => !Number.isFinite(p.responseMinutes) || p.responseMinutes < 5))
      return toast.error("Targets must be at least 5 minutes (0.08 h).");
    setSaving(true);
    try {
      await unwrap(
        fetch(`/api/categories/${category.id}/sla`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ policies }),
        }),
      );
      toast.success(`${category.name} targets saved. New requests use them straight away.`);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={category.archived ? "opacity-60" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
            <CategoryIcon icon={category.icon} className="size-4" />
          </span>
          {category.name}
          {category.archived && <Badge variant="secondary">Archived</Badge>}
        </CardTitle>
        <CardDescription>{category.description}</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              void patch(
                { archived: !category.archived },
                category.archived
                  ? `${category.name} restored`
                  : `${category.name} archived (hidden from the report form)`,
              )
            }
          >
            {category.archived ? <ArchiveRestore data-icon="inline-start" /> : <Archive data-icon="inline-start" />}
            {category.archived ? "Restore" : "Archive"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2 text-sm">
          <label htmlFor={`dp-${category.id}`} className="text-muted-foreground">
            Default priority
          </label>
          <NativeSelect
            id={`dp-${category.id}`}
            value={category.defaultPriority}
            onChange={(e) => void patch({ defaultPriority: e.target.value }, "Default priority updated")}
            className="h-8"
          >
            {REQUEST_PRIORITIES.map((p) => (
              <NativeSelectOption key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted/50 text-muted-foreground grid grid-cols-3 gap-2 px-3 py-2 text-xs font-medium">
            <span>Priority</span>
            <span>First response (hours)</span>
            <span>Resolution (hours)</span>
          </div>
          {REQUEST_PRIORITIES.map((p) => (
            <div key={p} className="grid grid-cols-3 items-center gap-2 border-t px-3 py-2">
              <span className="text-sm capitalize">{p}</span>
              {(["response", "resolution"] as const).map((k) => (
                <Input
                  key={k}
                  type="number"
                  min={0.1}
                  step={0.25}
                  inputMode="decimal"
                  aria-label={`${p} ${k} target in hours`}
                  value={sla[p][k]}
                  onChange={(e) => setSla((s) => ({ ...s, [p]: { ...s[p], [k]: e.target.value } }))}
                  className="h-8"
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={saveSla} disabled={!dirty || saving}>
            {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            Save targets
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
