import Link from "next/link";

import { PlusCircle } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/server/session";

import { PageHeader } from "../_components/page-header";
import { MyRequests } from "./_components/my-requests";

export const metadata: Metadata = { title: "My requests" };

export default async function MyRequestsPage() {
  await requireRole("student", "staff");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My requests"
        description="Everything you have reported, with live status."
        actions={
          <Button asChild className="h-9">
            <Link href="/dashboard/requests/new">
              <PlusCircle data-icon="inline-start" /> Report an issue
            </Link>
          </Button>
        }
      />
      <MyRequests />
    </div>
  );
}
