"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";

import { Button } from "@/components/ui/button";

import { LandingVideo } from "./landing-video";
import { MEDIA } from "./media";
import { AssignMock, ReportMock, ResolveMock } from "./ui-mocks";

const STEPS = [
  {
    title: "Report it in seconds",
    body: "Scan the QR sticker in any room or hostel. Location fills itself in, similar open reports are flagged, and a photo shows exactly what is wrong.",
    slot: MEDIA.stepReport,
    mock: <ReportMock />,
  },
  {
    title: "Track it live",
    body: "Admins assign the best officer in one click from suggestions ranked by skill and workload, and every change reaches you instantly.",
    slot: MEDIA.stepAssign,
    mock: <AssignMock />,
  },
  {
    title: "Resolve it for good",
    body: "Officers close jobs with notes and an after-photo. You confirm the fix and rate it, or reopen it if the problem comes back.",
    slot: MEDIA.stepResolve,
    mock: <ResolveMock />,
  },
];

const DURATION = 7000;
const PHONE = { w: 320, h: 600 };

/** MaintainX-style showcase: one gradient media panel, three columns with progress lines that auto-advance. */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = (active + 1) % STEPS.length;
    const id = window.setTimeout(() => setActive(next), DURATION);
    return () => window.clearTimeout(id);
  }, [active, paused]);

  const step = STEPS[active];

  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            From fault to{" "}
            <span className="from-primary bg-gradient-to-r to-emerald-400 bg-clip-text text-transparent">fixed</span>,
            on the record
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Every request follows the same accountable path, so nothing gets lost between a phone call and a repair.
          </p>
        </div>

        <div className="from-primary relative mt-12 flex h-[360px] items-start justify-center overflow-hidden rounded-2xl bg-gradient-to-br to-emerald-400 sm:h-[420px]">
          <div className="bg-blueprint absolute inset-0 opacity-60" aria-hidden="true" />
          <LandingVideo
            key={step.slot.id}
            slot={step.slot}
            fallback={step.mock}
            chrome={false}
            canvas={PHONE}
            className="animate-in fade-in slide-in-from-bottom-4 relative mt-10 w-[220px] rounded-[2rem] border-[6px] border-white/80 shadow-2xl duration-500 sm:w-[250px]"
          />
        </div>

        <div
          className="mt-10 grid gap-8 sm:grid-cols-3"
          role="tablist"
          aria-label="How ZEGA works"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              className={cn("group text-left transition-opacity", active !== i && "opacity-60 hover:opacity-100")}
            >
              <span className="bg-border relative block h-0.5 w-full overflow-hidden rounded-full">
                {active === i && (
                  <span
                    key={`${active}-${paused}`}
                    className="bg-primary absolute inset-y-0 left-0"
                    style={{
                      animation: paused ? "none" : `zega-progress ${DURATION}ms linear forwards`,
                      width: paused ? "100%" : undefined,
                    }}
                  />
                )}
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{s.body}</p>
            </button>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline" className="border-foreground h-10 px-5 font-semibold">
            <a href="#features">Explore all features</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
