import { ClipboardList } from "lucide-react";

import { Placeholder } from "@/app/(main)/dashboard/_components/placeholder";

export const metadata = { title: "All requests | ZEGA" };

export default function AdminRequestsPage() {
  return (
    <Placeholder
      title="All requests"
      description="Search, filter, assign and manage every request."
      icon={ClipboardList}
      message="Every request on campus will be listed here."
    />
  );
}
