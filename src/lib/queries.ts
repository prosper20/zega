"use client";

import { type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";

import type {
  AttachmentSchema,
  CommentSchema,
  OfficerSuggestionSchema,
  RequestDetailSchema,
  RequestListSchema,
  RequestSummarySchema,
  SimilarRequestSchema,
  TimelineItemSchema,
  TransitionInput,
} from "@/server/api/schemas/requests";

import { ApiError, unwrap } from "./api-client";

export type RequestSummary = z.infer<typeof RequestSummarySchema>;
export type RequestDetail = z.infer<typeof RequestDetailSchema>;
export type RequestList = z.infer<typeof RequestListSchema>;
export type TimelineItem = z.infer<typeof TimelineItemSchema>;
export type SimilarRequest = z.infer<typeof SimilarRequestSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type OfficerSuggestion = z.infer<typeof OfficerSuggestionSchema>;

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  defaultPriority: RequestSummary["priority"];
  archived: boolean;
  sla: { priority: RequestSummary["priority"]; responseMinutes: number; resolutionMinutes: number }[];
};
export type LocationOption = {
  id: string;
  parentId: string | null;
  name: string;
  code: string;
  kind: string;
  path: string;
  label: string;
  qrToken: string;
};

const get = <T>(path: string) => unwrap<T>(fetch(`/api${path}`, { credentials: "include" }));
const send = <T>(method: string, path: string, body?: unknown) =>
  unwrap<T>(
    fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

export const keys = {
  requests: ["requests"] as const,
  list: (params: Record<string, unknown>) => ["requests", "list", params] as const,
  detail: (id: string) => ["requests", "detail", id] as const,
  timeline: (id: string) => ["requests", "timeline", id] as const,
  categories: ["categories"] as const,
  locations: ["locations"] as const,
  notifications: ["notifications"] as const,
};

/** Builds a query string, dropping empty values and joining arrays with commas. */
export function toQuery(params: Record<string, unknown>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    qs.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function useRequestList(params: Record<string, unknown>) {
  return useInfiniteQuery({
    queryKey: keys.list(params),
    queryFn: ({ pageParam }) => get<RequestList>(`/requests${toQuery({ ...params, cursor: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pageInfo.nextCursor ?? undefined,
  });
}

export function useRequest(id: string, initial?: RequestDetail) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => get<RequestDetail>(`/requests/${encodeURIComponent(id)}`),
    initialData: initial,
    // Until live updates arrive (SSE), keep open requests fresh.
    refetchInterval: (q) =>
      q.state.data && ["closed", "rejected", "cancelled"].includes(q.state.data.status) ? false : 30_000,
  });
}

export function useTimeline(id: string) {
  return useQuery({
    queryKey: keys.timeline(id),
    queryFn: () => get<TimelineItem[]>(`/requests/${encodeURIComponent(id)}/timeline`),
    refetchInterval: 30_000,
  });
}

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: () => get<Category[]>("/categories"), staleTime: 5 * 60_000 });
}

export function useLocations() {
  return useQuery({
    queryKey: keys.locations,
    queryFn: () => get<LocationOption[]>("/locations"),
    staleTime: 5 * 60_000,
  });
}

export function useSimilar(params: { title: string; locationId?: string; categoryId?: string }, enabled: boolean) {
  return useQuery({
    queryKey: ["requests", "similar", params],
    queryFn: () => get<SimilarRequest[]>(`/requests/similar${toQuery(params)}`),
    enabled,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

function invalidateRequest(qc: QueryClient, id: string, data?: RequestDetail) {
  if (data) qc.setQueryData(keys.detail(data.id), data);
  if (data) qc.setQueryData(keys.detail(data.refCode), data);
  void qc.invalidateQueries({ queryKey: keys.timeline(id) });
  void qc.invalidateQueries({ queryKey: [...keys.requests, "list"] });
  void qc.invalidateQueries({ queryKey: keys.notifications });
}

export function useTransition(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransitionInput) =>
      send<RequestDetail>("POST", `/requests/${encodeURIComponent(id)}/transitions`, input),
    onSuccess: (data) => invalidateRequest(qc, id, data),
  });
}

export function useComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; internal?: boolean }) =>
      send<Comment>("POST", `/requests/${encodeURIComponent(id)}/comments`, input),
    onSuccess: () => invalidateRequest(qc, id),
  });
}

export function useVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      send<{ voteCount: number; hasVoted: boolean }>(on ? "PUT" : "DELETE", `/requests/${encodeURIComponent(id)}/vote`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.requests }),
  });
}

export async function createRequest(input: unknown) {
  return send<RequestDetail>("POST", "/requests", input);
}

export async function uploadAttachment(
  requestId: string,
  file: Blob,
  kind: "evidence" | "before" | "after" = "evidence",
) {
  const form = new FormData();
  form.set("file", file, file instanceof File ? file.name : "photo.jpg");
  form.set("kind", kind);
  return unwrap<Attachment>(
    fetch(`/api/requests/${encodeURIComponent(requestId)}/attachments`, {
      method: "POST",
      credentials: "include",
      body: form,
    }),
  );
}

/** Human message for an API error (field errors first). */
export function errorMessage(error: unknown) {
  if (error instanceof ApiError)
    return error.problem.errors?.[0]?.message ?? error.problem.detail ?? error.problem.title;
  return error instanceof Error ? error.message : "Something went wrong.";
}
