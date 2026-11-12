import { sql } from "drizzle-orm";

import type { Database, Tx } from "./types";

/** Actor id recorded by the audit trigger for writes made by the system (seed, cron). */
export const SYSTEM_ACTOR = "system";

/**
 * Runs `fn` in a transaction with `app.user_id` set, so the audit trigger attributes
 * every change made inside it to `actorId`.
 */
export function withActor<T>(db: Database, actorId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${actorId}, true)`);
    return fn(tx);
  });
}
