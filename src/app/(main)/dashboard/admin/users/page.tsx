import { Users } from "lucide-react";

import { Placeholder } from "@/app/(main)/dashboard/_components/placeholder";

export const metadata = { title: "Users & roles | ZEGA" };

export default function AdminUsersPage() {
  return (
    <Placeholder
      title="Users & roles"
      description="Create officers and admins, change roles and deactivate accounts."
      icon={Users}
      message="User management will appear here."
    />
  );
}
