import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth";
import { serviceRequests } from "./requests";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    requestId: uuid().references(() => serviceRequests.id, { onDelete: "cascade" }),
    data: jsonb().$type<Record<string, unknown>>(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt.desc())],
);
