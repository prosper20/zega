import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgSequence,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { tsvector } from "./_types";
import { users } from "./auth";
import { requestCategories } from "./catalog";
import { attachmentKind, requestPriority, requestStatus } from "./enums";
import { locations } from "./locations";

/** Backs human-readable reference codes like ZG-26-000123. */
export const requestRefSeq = pgSequence("service_request_ref_seq", { startWith: 1 });

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid().primaryKey().defaultRandom(),
    refCode: text()
      .notNull()
      .unique()
      .default(sql`'ZG-' || to_char(now(), 'YY') || '-' || lpad(nextval('service_request_ref_seq')::text, 6, '0')`),
    title: text().notNull(),
    description: text().notNull(),
    categoryId: uuid()
      .notNull()
      .references(() => requestCategories.id),
    locationId: uuid()
      .notNull()
      .references(() => locations.id),
    locationDetail: text(),
    priority: requestPriority().notNull().default("medium"),
    status: requestStatus().notNull().default("submitted"),
    requesterId: text()
      .notNull()
      .references(() => users.id),
    currentAssigneeId: text().references(() => users.id),
    responseDueAt: timestamp({ withTimezone: true }),
    resolutionDueAt: timestamp({ withTimezone: true }),
    firstResponseAt: timestamp({ withTimezone: true }),
    resolvedAt: timestamp({ withTimezone: true }),
    closedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp({ withTimezone: true }),
    /** Weighted full-text document: ref code and title (A), description (B). */
    search: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(ref_code, '')), 'A') || setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(description, '')), 'B')`,
    ),
  },
  (t) => [
    index("service_requests_status_idx").on(t.status),
    index("service_requests_requester_idx").on(t.requesterId),
    index("service_requests_assignee_idx").on(t.currentAssigneeId),
    index("service_requests_category_idx").on(t.categoryId),
    index("service_requests_location_idx").on(t.locationId),
    index("service_requests_created_idx").on(t.createdAt.desc(), t.id.desc()),
    index("service_requests_search_gin").using("gin", t.search),
    index("service_requests_title_trgm").using("gin", t.title.op("gin_trgm_ops")),
  ],
);

/** Full assignment history; the active row has `unassignedAt` null. */
export const assignments = pgTable(
  "assignments",
  {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    officerId: text()
      .notNull()
      .references(() => users.id),
    assignedById: text().references(() => users.id),
    note: text(),
    assignedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    unassignedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("assignments_request_idx").on(t.requestId),
    index("assignments_officer_active_idx").on(t.officerId).where(sql`${t.unassignedAt} is null`),
  ],
);

/** Every status transition: the request timeline. */
export const statusLogs = pgTable(
  "status_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    fromStatus: requestStatus(),
    toStatus: requestStatus().notNull(),
    actorId: text().references(() => users.id),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("status_logs_request_idx").on(t.requestId, t.createdAt)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    statusLogId: uuid().references(() => statusLogs.id, { onDelete: "set null" }),
    uploadedById: text()
      .notNull()
      .references(() => users.id),
    kind: attachmentKind().notNull().default("evidence"),
    url: text().notNull(),
    pathname: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attachments_request_idx").on(t.requestId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    authorId: text()
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    /** Internal notes are visible to officers and admins only. */
    internal: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_request_idx").on(t.requestId, t.createdAt)],
);

/** "Me too" votes instead of duplicate reports. */
export const requestVotes = pgTable(
  "request_votes",
  {
    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.requestId, t.userId] })],
);

/** One-to-one satisfaction rating given when the requester confirms the fix. */
export const ratings = pgTable(
  "ratings",
  {
    requestId: uuid()
      .primaryKey()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    ratedById: text()
      .notNull()
      .references(() => users.id),
    score: smallint().notNull(),
    comment: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("ratings_score_range", sql`${t.score} between 1 and 5`)],
);
