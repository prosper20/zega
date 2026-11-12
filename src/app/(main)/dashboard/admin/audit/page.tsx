import { ShieldCheck } from "lucide-react";

import { Placeholder } from "@/app/(main)/dashboard/_components/placeholder";

export const metadata = { title: "Audit trail | ZEGA" };

export default function AdminAuditPage() {
  return (
    <Placeholder
      title="Audit trail"
      description="Every change on record, with integrity verification."
      icon={ShieldCheck}
      message="The audit trail will appear here."
    />
  );
}
