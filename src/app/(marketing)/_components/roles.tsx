"use client";

import { CheckCircle2, GraduationCap, ShieldCheck, Wrench } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { LandingVideo } from "./landing-video";
import { MEDIA } from "./media";
import { AdminMock, BoardMock, TrackMock } from "./ui-mocks";

const ROLES = [
  {
    id: "requester",
    tab: "Students & staff",
    icon: GraduationCap,
    title: "Report once. Always know where it stands.",
    points: [
      "Guided form with category, location and photo evidence",
      "Reference code and a live timeline for every request",
      "“Me too” on existing reports instead of duplicates",
      "Confirm the fix and rate the service",
    ],
    slot: MEDIA.roleRequester,
    mock: <TrackMock />,
  },
  {
    id: "officer",
    tab: "Maintenance officers",
    icon: Wrench,
    title: "Your work orders, in your pocket.",
    points: [
      "Drag-and-drop board of assigned jobs",
      "SLA countdowns so urgent work comes first",
      "Before and after photos with progress notes",
      "Installable on your phone for use around campus",
    ],
    slot: MEDIA.roleOfficer,
    mock: <BoardMock />,
  },
  {
    id: "admin",
    tab: "Administrators",
    icon: ShieldCheck,
    title: "Assign, monitor and report with confidence.",
    points: [
      "Smart assignment ranked by officer skill and workload",
      "Search, filter and bulk-manage every request",
      "PDF and CSV reports on volume, SLAs and satisfaction",
      "Tamper-evident audit trail of every action",
    ],
    slot: MEDIA.roleAdmin,
    mock: <AdminMock />,
  },
];

export function Roles() {
  return (
    <section id="roles" className="bg-card scroll-mt-20 border-y py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">Who it's for</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">One platform, three dashboards</h2>
        </div>
        <Tabs defaultValue="requester" className="mt-12">
          <TabsList className="mx-auto h-auto flex-wrap justify-center">
            {ROLES.map((role) => (
              <TabsTrigger key={role.id} value={role.id} className="gap-2 px-4 py-2">
                <role.icon className="size-4" /> {role.tab}
              </TabsTrigger>
            ))}
          </TabsList>
          {ROLES.map((role) => (
            <TabsContent key={role.id} value={role.id} className="mt-10">
              <div className="grid items-center gap-10 lg:grid-cols-2">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{role.title}</h3>
                  <ul className="mt-6 space-y-3">
                    {role.points.map((point) => (
                      <li key={point} className="flex gap-3">
                        <CheckCircle2 className="text-primary mt-0.5 size-5 shrink-0" />
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <LandingVideo slot={role.slot} fallback={role.mock} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
