import { requireUser } from "@/server/session";

import { AdminDashboard } from "./_components/home/admin/admin-dashboard";
import { OfficerHome } from "./_components/home/officer-home";
import { RequesterHome } from "./_components/home/requester-home";
import { PageHeader } from "./_components/page-header";

/** Role-based dashboard: requesters, officers and administrators each get their own home. */
export default async function DashboardHome() {
  const user = await requireUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`${greeting}, ${user.name.split(" ")[0]}`} description="Report it. Track it. Resolve it." />
      {user.role === "admin" ? (
        <AdminDashboard />
      ) : user.role === "officer" ? (
        <OfficerHome user={user} />
      ) : (
        <RequesterHome user={user} />
      )}
    </div>
  );
}
