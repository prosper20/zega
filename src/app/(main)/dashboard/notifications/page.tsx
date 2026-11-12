import { Bell } from "lucide-react";

import { Placeholder } from "@/app/(main)/dashboard/_components/placeholder";

export const metadata = { title: "Notifications | ZEGA" };

export default function NotificationsPage() {
  return (
    <Placeholder
      title="Notifications"
      description="Updates on requests you are involved in."
      icon={Bell}
      message="You are all caught up."
    />
  );
}
