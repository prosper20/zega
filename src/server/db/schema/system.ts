import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const systemJobs = pgTable("system_jobs", {
  name: text().primaryKey(),
  lastRunAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lastResult: text(),
});
