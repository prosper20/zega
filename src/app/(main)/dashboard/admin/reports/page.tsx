import { FileBarChart } from "lucide-react";

import { Placeholder } from "@/app/(main)/dashboard/_components/placeholder";

export const metadata = { title: "Reports | ZEGA" };

export default function AdminReportsPage() {
  return (
    <Placeholder
      title="Reports"
      description="Performance summaries with PDF and CSV export."
      icon={FileBarChart}
      message="Reports will appear here."
    />
  );
}
