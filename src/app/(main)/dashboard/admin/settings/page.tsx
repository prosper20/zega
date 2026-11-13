import type { Metadata } from "next";

import { PageHeader } from "../../_components/page-header";
import { CategorySettings } from "./_components/category-settings";

export const metadata: Metadata = { title: "Categories & SLAs" };

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categories & SLAs"
        description="Response and resolution targets per category and priority. New requests get due dates from these; breaches are flagged and escalated."
      />
      <CategorySettings />
    </div>
  );
}
