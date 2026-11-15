import { sql } from "drizzle-orm";

import { log } from "@/server/log";

import type { Database, Tx } from "./types";
import { AsyncLocalStorage } from "node:async_hooks";

/** Actor id recorded by the audit trigger for writes made by the system (seed, cron). */
export const SYSTEM_ACTOR = "system";

type AfterCommit = () => Promise<unknown>;
const afterCommitStore = new AsyncLocalStorage<AfterCommit[]>();

/** Runs after the surrounding withActor transaction commits; never if it rolls back. */
export function afterCommit(fn: AfterCommit) {
  const queue = afterCommitStore.getStore();
  if (queue) queue.push(fn);
  else void fn().catch((err) => log.error("after_commit.failed", { err }));
}

/** Transaction with app.user_id set so the audit trigger records who made each change. */
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
      Promise.allSettled(queue.map((job) => job().catch((err) => log.error("after_commit.failed", { actorId, err })))),
      timeout,
    ]);
  }
  return result;
}
