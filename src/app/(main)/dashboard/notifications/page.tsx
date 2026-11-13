import type { Metadata } from "next";

import { PageHeader } from "../_components/page-header";
import { NotificationsList } from "./_components/notifications-list";

export const metadata: Metadata = { title: "Notifications | ZEGA" };

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Updates on requests you are involved in. New ones appear instantly."
      />
      <NotificationsList />
    </div>
  );
}
