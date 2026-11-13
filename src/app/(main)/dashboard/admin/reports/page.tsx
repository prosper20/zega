import type { Metadata } from "next";

import { PageHeader } from "../../_components/page-header";
import { ReportBuilder } from "./_components/report-builder";

export const metadata: Metadata = { title: "Reports | ZEGA" };

export default function AdminReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Performance over any period, as a printable PDF or a CSV of every request."
      />
      <ReportBuilder />
    </div>
  );
}
