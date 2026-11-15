"use client";

import Link from "next/link";

import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { LandingVideo } from "./landing-video";
import { MEDIA } from "./media";
import { AdminMock, BoardMock, TrackMock } from "./ui-mocks";

const ROLES = [
  {
    id: "requester",
    tab: "Students & staff",
    title: "Report once. Always know where it stands.",
    body: "Submit a request with photos in under a minute, then follow it on a live timeline until it is fixed.",
    points: [
      "Guided form with category, location and photo evidence",
      "A reference code and live timeline for every request",
      "“Me too” on existing reports instead of duplicates",
      "Confirm the fix and rate the service",
    ],
    cta: { label: "Report an issue", href: "/auth/register" },
    slot: MEDIA.roleRequester,
    mock: <TrackMock />,
  },
  {
    id: "officer",
    tab: "Maintenance officers",
    title: "Your work orders, in your pocket.",
    body: "See exactly what is assigned to you, what is urgent and what is overdue, and update jobs from anywhere on campus.",
    points: [
      "Drag-and-drop board of assigned jobs",
      "SLA countdowns so urgent work comes first",
      "Before and after photos with progress notes",
      "Installable on your phone",
    ],
    cta: { label: "Officer log in", href: "/auth/login" },
    slot: MEDIA.roleOfficer,
    mock: <BoardMock />,
  },
  {
    id: "admin",
    tab: "Administrators",
    title: "Assign, monitor and report with confidence.",
    body: "One console to triage every request, assign the right officer and prove performance with real numbers.",
    points: [
      "Smart assignment ranked by skill and workload",
      "Search, filter and bulk-manage every request",
      "PDF and CSV reports on volume, SLAs and satisfaction",
      "Tamper-evident audit trail of every action",
    ],
    cta: { label: "Admin log in", href: "/auth/login" },
    slot: MEDIA.roleAdmin,
    mock: <AdminMock />,
  },
];

export function Roles() {
  return (
    <section id="roles" className="bg-primary relative scroll-mt-16 overflow-hidden py-20 text-white sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-bold tracking-tight text-balance sm:text-5xl">
          One platform, a dashboard for every role on campus
        </h2>
        <Tabs defaultValue="requester" className="mt-12">
          <TabsList className="mx-auto h-auto flex-wrap justify-center gap-x-8 gap-y-2 rounded-none bg-transparent p-0">
            {ROLES.map((role) => (
              <TabsTrigger
                key={role.id}
                value={role.id}
                className="h-auto flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2 text-base font-semibold text-white/75 shadow-none hover:text-white data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
              >
                {role.tab}
              </TabsTrigger>
            ))}
          </TabsList>
          {ROLES.map((role) => (
            <TabsContent key={role.id} value={role.id} className="mt-12">
              <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.5fr]">
                <div>
                  <h3 className="text-3xl font-bold tracking-tight">{role.title}</h3>
                  <p className="mt-4 text-white/85">{role.body}</p>
                  <ul className="mt-6 space-y-3">
                    {role.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={role.cta.href}
                    className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                  >
                    {role.cta.label} <ArrowRight className="size-4" />
                  </Link>
                </div>
                <div className="flex items-center justify-center rounded-xl border border-white/20 bg-white/10 p-3 sm:p-12">
                  <LandingVideo
                    slot={role.slot}
                    fallback={role.mock}
                    chrome={false}
                    className="w-full max-w-lg border-0 shadow-lg"
                  />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
