import type { Metadata } from "next";

import { requireUser } from "@/server/session";

import { PageHeader } from "../_components/page-header";
import { ChangePasswordCard } from "./_components/change-password-card";
import { EmailPreferencesCard } from "./_components/email-preferences-card";
import { ProfileDetails } from "./_components/profile-details";
import { SessionsCard } from "./_components/sessions-card";

export const metadata: Metadata = { title: "Profile & sessions | ZEGA" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile & sessions" description="Your account details and where you are signed in." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <ProfileDetails user={user} />
          <EmailPreferencesCard />
          <ChangePasswordCard />
        </div>
        <SessionsCard />
      </div>
    </div>
  );
}
