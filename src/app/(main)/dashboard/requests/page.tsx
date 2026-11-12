import { ClipboardList } from "lucide-react";

import { Placeholder } from "@/app/(main)/dashboard/_components/placeholder";

export const metadata = { title: "My requests | ZEGA" };

export default function MyRequestsPage() {
  return (
    <Placeholder
      title="My requests"
      description="Everything you have reported, with live status."
      icon={ClipboardList}
      message="Requests you report will appear here with their reference codes and status."
    />
  );
}
