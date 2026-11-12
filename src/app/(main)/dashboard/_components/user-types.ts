import type { RoleSlug } from "@/domain/constants";

/** Serializable subset of the signed-in user passed from the server layout to client components. */
export type ShellUser = {
  name: string;
  email: string;
  image: string | null;
  role: RoleSlug;
};

export const ROLE_LABEL: Record<RoleSlug, string> = {
  student: "Student",
  staff: "Staff",
  officer: "Maintenance officer",
  admin: "Administrator",
};
