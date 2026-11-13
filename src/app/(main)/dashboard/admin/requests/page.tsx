import type { Metadata } from "next";

import { PageHeader } from "../../_components/page-header";
import { RequestsTable } from "./_components/requests-table";

export const metadata: Metadata = { title: "All requests | ZEGA" };

export default function AdminRequestsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="All requests" description="Search, filter, assign and manage every request on campus." />
      <RequestsTable />
    </div>
  );
}
