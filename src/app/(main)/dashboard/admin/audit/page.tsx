import type { Metadata } from "next";

import { PageHeader } from "../../_components/page-header";
import { AuditLog } from "./_components/audit-log";

export const metadata: Metadata = { title: "Audit trail" };

export default function AdminAuditPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit trail"
        description="Every change to requests, assignments, users and settings, recorded by the database itself. Each entry is hash-chained to the previous one, so tampering is detectable."
      />
      <AuditLog />
    </div>
  );
}
