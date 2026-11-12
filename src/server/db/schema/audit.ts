import { bigserial, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { auditAction } from "./enums";

/**
 * Append-only audit trail written by a generic Postgres trigger on every audited table.
 * Each row stores sha256(prev_hash || row digest), forming a hash chain: editing or deleting
 * any historical row breaks every hash after it, which `audit_verify_chain()` detects.
 */
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
