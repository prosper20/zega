import type { Database } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";

/** Resolves the caller from a request (session cookie or Bearer JWT). Injected so tests can fake it. */
export type Authenticate = (req: Request) => Promise<CurrentUser | null>;

export type ApiDeps = {
  db: Database;
  authenticate: Authenticate;
};

export type AppEnv = {
  Variables: {
    db: Database;
    user: CurrentUser | null;
    requestId: string;
  };
};
