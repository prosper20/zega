import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Last run time of background jobs. Claimed atomically with
 * `update ... where last_run_at < now() - interval` so only one instance runs a job per window.
 */
export const systemJobs = pgTable("system_jobs", {
  name: text().primaryKey(),
  lastRunAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lastResult: text(),
});
