import type { Database } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";
import type { Storage } from "@/server/storage";

/** Resolves the caller from a request (session cookie or Bearer JWT). Injected so tests can fake it. */
export type Authenticate = (req: Request) => Promise<CurrentUser | null>;

export type ApiDeps = {
  db: Database;
  authenticate: Authenticate;
  storage: Storage;
};

export type AppEnv = {
  Variables: {
    db: Database;
    storage: Storage;
    user: CurrentUser | null;
    requestId: string;
  };
};
