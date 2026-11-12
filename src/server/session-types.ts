import type { RoleSlug } from "@/domain/constants";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: RoleSlug;
  department: string | null;
  matricOrStaffNo: string | null;
};
