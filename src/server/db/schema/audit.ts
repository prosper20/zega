import { bigserial, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { auditAction } from "./enums";

// Written by a trigger; each row hashes the previous one, so edits break the chain.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    tableName: text().notNull(),
    rowId: text().notNull(),
    action: auditAction().notNull(),
    actorId: text(),
    diff: jsonb().$type<Record<string, unknown>>().notNull(),
    prevHash: text(),
    hash: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_row_idx").on(t.tableName, t.rowId), index("audit_logs_actor_idx").on(t.actorId)],
);
