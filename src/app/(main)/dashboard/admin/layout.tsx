import type { ReactNode } from "react";

import { requireRole } from "@/server/session";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole("admin");
  return children;
}
