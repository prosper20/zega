import { Settings2 } from "lucide-react";

import { Placeholder } from "@/app/(main)/dashboard/_components/placeholder";

export const metadata = { title: "Categories & SLAs | ZEGA" };

export default function AdminSettingsPage() {
  return (
    <Placeholder
      title="Categories & SLAs"
      description="Request categories and their response and resolution targets."
      icon={Settings2}
      message="Categories and SLA policies will appear here."
    />
  );
}
