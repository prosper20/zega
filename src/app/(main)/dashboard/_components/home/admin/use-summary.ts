"use client";

import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";

import { unwrap } from "@/lib/api-client";
import { toQuery } from "@/lib/queries";
import type { SummarySchema } from "@/server/api/routes/reports";

export type Summary = z.infer<typeof SummarySchema>;

export function rangeDates(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export function useSummary(days: number) {
  const range = rangeDates(days);
  return useQuery({
    queryKey: ["reports", "summary", range],
    queryFn: () => unwrap<Summary>(fetch(`/api/reports/summary${toQuery(range)}`, { credentials: "include" })),
    placeholderData: (prev) => prev,
  });
}
