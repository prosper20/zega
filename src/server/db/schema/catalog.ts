import { integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth";
import { requestPriority } from "./enums";

export const requestCategories = pgTable("request_categories", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text().notNull().default(""),
  /** lucide icon name rendered by the UI */
  icon: text().notNull().default("wrench"),
  defaultPriority: requestPriority().notNull().default("medium"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp({ withTimezone: true }),
});

/** Response and resolution targets per category and priority. */
export const slaPolicies = pgTable(
  "sla_policies",
  {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid()
      .notNull()
      .references(() => requestCategories.id, { onDelete: "cascade" }),
    priority: requestPriority().notNull(),
    responseMinutes: integer().notNull(),
    resolutionMinutes: integer().notNull(),
  },
  (t) => [unique("sla_policies_category_priority_uq").on(t.categoryId, t.priority)],
);

/** Many-to-many: which categories each officer is skilled in (drives assignment suggestions). */
export const officerSpecialties = pgTable(
  "officer_specialties",
  {
    officerId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid()
      .notNull()
      .references(() => requestCategories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.officerId, t.categoryId] })],
);
