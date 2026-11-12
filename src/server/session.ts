import "server-only";

import { cache } from "react";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { RoleSlug } from "@/domain/constants";

import { auth } from "./auth";
import type { CurrentUser } from "./session-types";

export type { CurrentUser } from "./session-types";

/** The signed-in user for this request (memoised per render), or null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
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
});

/** Redirects to login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

/** Redirects to /unauthorized when the user's role is not allowed. Defence in depth behind proxy.ts. */
export async function requireRole(...roles: RoleSlug[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/unauthorized");
  return user;
}
