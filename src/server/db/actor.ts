import { sql } from "drizzle-orm";

import type { Database, Tx } from "./types";
import { AsyncLocalStorage } from "node:async_hooks";

/** Actor id recorded by the audit trigger for writes made by the system (seed, cron). */
export const SYSTEM_ACTOR = "system";

type AfterCommit = () => Promise<unknown>;
const afterCommitStore = new AsyncLocalStorage<AfterCommit[]>();

/**
 * Schedules work (e.g. sending an email) to run only after the surrounding `withActor`
 * transaction commits. If the transaction rolls back, the work never happens.
 * Outside a transaction it runs immediately.
 */
export function afterCommit(fn: AfterCommit) {
  const queue = afterCommitStore.getStore();
  if (queue) queue.push(fn);
  else void fn().catch((e) => console.error("[afterCommit]", e));
}

/**
 * Runs `fn` in a transaction with `app.user_id` set, so the audit trigger attributes
 * every change made inside it to `actorId`. Work queued with `afterCommit` runs once it commits.
 */
export async function withActor<T>(db: Database, actorId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const queue: AfterCommit[] = [];
  const result = await afterCommitStore.run(queue, () =>
    db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.user_id', ${actorId}, true)`);
      return fn(tx);
    }),
  );
  if (queue.length) {
    // Awaited (with a cap) so serverless functions do not freeze before the work finishes.
    const timeout = new Promise((resolve) => setTimeout(resolve, 8000));
    await Promise.race([
      Promise.allSettled(queue.map((job) => job().catch((e) => console.error("[afterCommit]", e)))),
      timeout,
    ]);
  }
  return result;
}
