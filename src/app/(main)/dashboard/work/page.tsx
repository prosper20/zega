import type { Metadata } from "next";

import { requireRole } from "@/server/session";

import { PageHeader } from "../_components/page-header";
import { InstallAppButton } from "./_components/install-app-button";
import { WorkBoard } from "./_components/work-board";

export const metadata: Metadata = { title: "My work orders" };

export default async function WorkPage() {
  const user = await requireRole("officer");
  return (
    <div className="flex flex-col gap-6" data-content-padding="true">
      <PageHeader
        title="My work orders"
        description="Drag a job to update its status. Most urgent first."
        actions={<InstallAppButton />}
      />
      <WorkBoard officerId={user.id} />
    </div>
  );
}
