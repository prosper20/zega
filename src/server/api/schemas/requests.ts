import { z } from "@hono/zod-openapi";

import { REQUEST_PRIORITIES, REQUEST_STATUSES, ROLE_SLUGS } from "@/domain/constants";

import { CursorQuery, PageInfoSchema } from "./common";

export const StatusEnum = z.enum(REQUEST_STATUSES).openapi("RequestStatus");
export const PriorityEnum = z.enum(REQUEST_PRIORITIES).openapi("RequestPriority");
export const SlaStateEnum = z.enum(["met", "on_track", "at_risk", "breached", "none"]).openapi("SlaState");

export const UserRefSchema = z
  .object({ id: z.string(), name: z.string(), role: z.enum(ROLE_SLUGS).optional() })
  .openapi("UserRef");

export const CategoryRefSchema = z
  .object({ id: z.uuid(), slug: z.string(), name: z.string(), icon: z.string() })
  .openapi("CategoryRef");

export const LocationRefSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    code: z.string(),
    label: z.string().openapi({ example: "Moremi Hall › Floor 2 › Shower block" }),
  })
  .openapi("LocationRef");

export const RequestSummarySchema = z
  .object({
    id: z.uuid(),
    refCode: z.string().openapi({ example: "ZG-26-000123" }),
    title: z.string(),
    status: StatusEnum,
    priority: PriorityEnum,
    category: CategoryRefSchema,
    location: LocationRefSchema,
    requester: UserRefSchema,
    assignee: UserRefSchema.nullable(),
    voteCount: z.number().int(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    responseDueAt: z.string().datetime().nullable(),
    resolutionDueAt: z.string().datetime().nullable(),
    resolvedAt: z.string().datetime().nullable(),
    closedAt: z.string().datetime().nullable(),
    sla: z.object({ response: SlaStateEnum, resolution: SlaStateEnum }),
  })
  .openapi("RequestSummary");

export const TransitionOptionSchema = z
  .object({ to: StatusEnum, label: z.string(), requiresNote: z.boolean(), requiresAssignee: z.boolean() })
  .openapi("TransitionOption");

export const AttachmentSchema = z
  .object({
    id: z.uuid(),
    url: z.string(),
    kind: z.enum(["evidence", "before", "after"]),
    contentType: z.string(),
    sizeBytes: z.number().int(),
    createdAt: z.string().datetime(),
    uploadedBy: z.object({ id: z.string(), name: z.string() }),
  })
  .openapi("Attachment");

export const RequestDetailSchema = RequestSummarySchema.extend({
  description: z.string(),
  locationDetail: z.string().nullable(),
  firstResponseAt: z.string().datetime().nullable(),
  hasVoted: z.boolean(),
  rating: z.object({ score: z.number().int(), comment: z.string().nullable() }).nullable(),
  attachments: z.array(AttachmentSchema),
  availableTransitions: z.array(TransitionOptionSchema),
  can: z.object({
    upload: z.array(z.enum(["evidence", "before", "after"])),
    edit: z.boolean(),
    assign: z.boolean(),
    comment: z.boolean(),
    internalNotes: z.boolean(),
    vote: z.boolean(),
  }),
}).openapi("RequestDetail");

export const RequestListSchema = z
  .object({ data: z.array(RequestSummarySchema), pageInfo: PageInfoSchema })
  .openapi("RequestList");

const csv = <T extends z.ZodType<string, string>>(item: T) =>
  z
    .union([z.array(item), z.string()])
    .optional()
    .transform((v) =>
      v === undefined ? undefined : (Array.isArray(v) ? v : v.split(",")).map((x) => String(x).trim()).filter(Boolean),
    )
    .pipe(z.array(item).optional());

export const RequestListQuery = z.object({
  q: z
    .string()
    .trim()
    .max(200)
    .optional()
    .openapi({ description: "Full-text search over reference code, title and description", example: "leaking pipe" }),
  status: csv(StatusEnum).openapi({ description: "Comma-separated statuses", example: "submitted,assigned" }),
  priority: csv(PriorityEnum).openapi({ example: "high,urgent" }),
  category: csv(z.string()).openapi({ description: "Category slugs", example: "plumbing" }),
  location: z.uuid().optional().openapi({ description: "Location id; includes everything inside it" }),
  assignee: z.string().optional().openapi({ description: "Officer id, `me` or `none`", example: "me" }),
  scope: z.enum(["mine", "all"]).optional().openapi({ description: "`mine` limits to requests you reported" }),
  sla: z.enum(["breached", "at_risk"]).optional(),
  open: z.enum(["true", "false"]).optional().openapi({ description: "Only open (true) or finished (false) requests" }),
  from: z.coerce.date().optional().openapi({ example: "2026-10-01" }),
  to: z.coerce.date().optional().openapi({ example: "2026-11-12" }),
  sort: z.enum(["newest", "oldest", "priority", "due"]).default("newest"),
  ...CursorQuery,
});
export type RequestListInput = z.infer<typeof RequestListQuery>;

export const CreateRequestSchema = z
  .object({
    title: z.string().trim().min(5).max(120).openapi({ example: "Leaking pipe under the sink" }),
    description: z
      .string()
      .trim()
      .min(10)
      .max(2000)
      .openapi({ example: "Water has been pooling on the floor since yesterday evening." }),
    categoryId: z.uuid(),
    locationId: z.uuid(),
    locationDetail: z.string().trim().max(200).optional().openapi({ example: "Second cubicle from the door" }),
    priority: PriorityEnum.optional().openapi({ description: "Defaults to the category's default priority" }),
  })
  .openapi("CreateRequest");
export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;

export const UpdateRequestSchema = z
  .object({
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(10).max(2000),
    locationId: z.uuid(),
    locationDetail: z.string().trim().max(200).nullable(),
    categoryId: z.uuid().openapi({ description: "Admins only" }),
    priority: PriorityEnum.openapi({ description: "Admins only" }),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.")
  .openapi("UpdateRequest");
export type UpdateRequestInput = z.infer<typeof UpdateRequestSchema>;

export const TransitionSchema = z
  .object({
    to: StatusEnum,
    note: z.string().trim().max(1000).optional().openapi({ example: "Replaced the washer, no more leak." }),
    rating: z
      .object({ score: z.number().int().min(1).max(5), comment: z.string().trim().max(500).optional() })
      .optional()
      .openapi({ description: "Optional satisfaction rating when the requester confirms (to = closed)" }),
  })
  .openapi("Transition");
export type TransitionInput = z.infer<typeof TransitionSchema>;

export const AssignSchema = z
  .object({ officerId: z.string().min(1), note: z.string().trim().max(500).optional() })
  .openapi("Assign");
export type AssignInput = z.infer<typeof AssignSchema>;

export const CommentSchema = z
  .object({
    id: z.uuid(),
    body: z.string(),
    internal: z.boolean(),
    author: UserRefSchema,
    createdAt: z.string().datetime(),
  })
  .openapi("Comment");

export const CreateCommentSchema = z
  .object({
    body: z.string().trim().min(1).max(2000).openapi({ example: "Parts ordered, fixing tomorrow morning." }),
    internal: z.boolean().default(false).openapi({ description: "Staff-only note (officers and admins)" }),
  })
  .openapi("CreateComment");

export const TimelineItemSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("status"),
      at: z.string().datetime(),
      actor: UserRefSchema.nullable(),
      from: StatusEnum.nullable(),
      to: StatusEnum,
      note: z.string().nullable(),
    }),
    z.object({
      kind: z.literal("assignment"),
      at: z.string().datetime(),
      actor: UserRefSchema.nullable(),
      officer: UserRefSchema,
      note: z.string().nullable(),
    }),
    z.object({
      kind: z.literal("comment"),
      at: z.string().datetime(),
      actor: UserRefSchema,
      body: z.string(),
      internal: z.boolean(),
    }),
    z.object({
      kind: z.literal("attachment"),
      at: z.string().datetime(),
      actor: UserRefSchema,
      url: z.string(),
      attachmentKind: z.string(),
      contentType: z.string(),
    }),
  ])
  .openapi("TimelineItem");

export const SimilarQuery = z.object({
  title: z.string().trim().min(3).max(120).openapi({ example: "leaking pipe" }),
  locationId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
});

export const SimilarRequestSchema = z
  .object({
    id: z.uuid(),
    refCode: z.string(),
    title: z.string(),
    status: StatusEnum,
    location: z.string(),
    voteCount: z.number().int(),
    hasVoted: z.boolean(),
    mine: z.boolean(),
    similarity: z.number(),
    createdAt: z.string().datetime(),
  })
  .openapi("SimilarRequest");

export const OfficerSuggestionSchema = z
  .object({
    officer: UserRefSchema,
    specialties: z.array(z.string()),
    specialist: z.boolean(),
    openJobs: z.number().int(),
    score: z.number().int().openapi({ description: "0 to 100, higher is a better match" }),
  })
  .openapi("OfficerSuggestion");
