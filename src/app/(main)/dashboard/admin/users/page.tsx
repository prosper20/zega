import type { Metadata } from "next";

import { requireRole } from "@/server/session";

import { PageHeader } from "../../_components/page-header";
import { PermissionMatrix } from "./_components/permission-matrix";
import { UsersManager } from "./_components/users-manager";

export const metadata: Metadata = { title: "Users & roles | ZEGA" };

export default async function AdminUsersPage() {
  const me = await requireRole("admin");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users & roles"
        description="Add officers and admins, change roles, deactivate accounts and set officer specialties."
      />
      <UsersManager currentUserId={me.id} />
      <PermissionMatrix />
    </div>
  );
}
