import Link from "next/link";

import { ArrowRight, ClipboardList, PlusCircle, ShieldCheck, Wrench } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoleSlug } from "@/domain/constants";
import { requireUser } from "@/server/session";

import { PageHeader } from "./_components/page-header";

const QUICK_LINKS: Record<RoleSlug, { href: string; title: string; body: string; icon: typeof PlusCircle }[]> = {
  student: [
    {
      href: "/dashboard/requests/new",
      title: "Report an issue",
      body: "Tell us what is broken and where.",
      icon: PlusCircle,
    },
    {
      href: "/dashboard/requests",
      title: "My requests",
      body: "Follow your reports to resolution.",
      icon: ClipboardList,
    },
  ],
  staff: [
    {
      href: "/dashboard/requests/new",
      title: "Report an issue",
      body: "Tell us what is broken and where.",
      icon: PlusCircle,
    },
    {
      href: "/dashboard/requests",
      title: "My requests",
      body: "Follow your reports to resolution.",
      icon: ClipboardList,
    },
  ],
  officer: [
    {
      href: "/dashboard/work",
      title: "My work orders",
      body: "Jobs assigned to you, most urgent first.",
      icon: Wrench,
    },
  ],
  admin: [
    {
      href: "/dashboard/admin/requests",
      title: "All requests",
      body: "Triage, assign and monitor every request.",
      icon: ClipboardList,
    },
    { href: "/dashboard/admin/audit", title: "Audit trail", body: "Every change on record.", icon: ShieldCheck },
  ],
};

export default async function DashboardHome() {
  const user = await requireUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`${greeting}, ${user.name.split(" ")[0]}`} description="Report it. Track it. Resolve it." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {QUICK_LINKS[user.role].map((l) => (
          <Link key={l.href} href={l.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="bg-accent text-accent-foreground mb-2 flex size-10 items-center justify-center rounded-lg">
                  <l.icon className="size-5" />
                </div>
                <CardTitle className="flex items-center gap-1">
                  {l.title} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
                <CardDescription>{l.body}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
