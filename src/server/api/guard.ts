import type { Context } from "hono";

import type { RoleSlug } from "@/domain/constants";
import { can, type Permission } from "@/domain/permissions";
import type { CurrentUser } from "@/server/session-types";

import type { AppEnv } from "./context";
import { problems } from "./problem";

/** Returns the signed-in user or throws 401. */
export function requireUser(c: Context<AppEnv>): CurrentUser {
  const user = c.get("user");
  if (!user) throw problems.unauthorized();
  return user;
}

export function requirePermission(c: Context<AppEnv>, permission: Permission): CurrentUser {
  const user = requireUser(c);
  if (!can(user.role, permission)) throw problems.forbidden();
  return user;
}

export function requireRoleIn(c: Context<AppEnv>, ...roles: RoleSlug[]): CurrentUser {
  const user = requireUser(c);
  if (!roles.includes(user.role)) throw problems.forbidden();
  return user;
}

/** Security requirement for OpenAPI: session cookie or Bearer JWT. */
export const authed: Record<string, string[]>[] = [{ cookieAuth: [] }, { bearerAuth: [] }];
