import "server-only";

import { eq } from "drizzle-orm";

import type { RoleSlug } from "@/domain/constants";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import type { CurrentUser } from "@/server/session-types";

import type { Authenticate } from "./context";

async function loadUser(id: string): Promise<CurrentUser | null> {
  const [u] = await db
    .select({
      id: s.users.id,
      name: s.users.name,
      email: s.users.email,
      image: s.users.image,
      role: s.users.role,
      department: s.users.department,
      matricOrStaffNo: s.users.matricOrStaffNo,
      banned: s.users.banned,
    })
    .from(s.users)
    .where(eq(s.users.id, id));
  if (!u || u.banned) return null;
  return { ...u, role: u.role as RoleSlug };
}

// Bearer JWT if present (user reloaded so role changes apply at once), otherwise the session cookie.
export const authenticate: Authenticate = async (req) => {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    const result = await auth.api.verifyJWT({ body: { token } }).catch(() => null);
    const sub = result?.payload?.sub;
    return sub ? loadUser(sub) : null;
  }
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.banned) return null;
  const u = session.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    role: (u.role ?? "student") as RoleSlug,
    department: (u.department as string | null | undefined) ?? null,
    matricOrStaffNo: (u.matricOrStaffNo as string | null | undefined) ?? null,
  };
};
