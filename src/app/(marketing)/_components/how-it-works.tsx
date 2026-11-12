"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";

import { LandingVideo } from "./landing-video";
import { MEDIA } from "./media";
import { AssignMock, ReportMock, ResolveMock } from "./ui-mocks";

const STEPS = [
  {
    title: "Report it",
    body: "Scan the QR sticker in any room or hostel. Location is filled in, ZEGA flags similar open reports, and you add a photo of the fault.",
    slot: MEDIA.stepReport,
    mock: <ReportMock />,
  },
  {
    title: "Track it",
    body: "Admins assign the best officer in one click from smart suggestions ranked by skill and workload. Every change reaches you live.",
    slot: MEDIA.stepAssign,
    mock: <AssignMock />,
  },
  {
    title: "Resolve it",
    body: "Officers close jobs with notes and an after-photo. You confirm the fix and rate it, or reopen it if the problem is back.",
    slot: MEDIA.stepResolve,
    mock: <ResolveMock />,
  },
];

const DURATION = 7000;

/** MaintainX-style auto-advancing feature switcher with a progress bar on the active step. */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = (active + 1) % STEPS.length;
    const id = window.setTimeout(() => setActive(next), DURATION);
    return () => window.clearTimeout(id);
  }, [active, paused]);

  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">How it works</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">From fault to fixed, on the record</h2>
        </div>
        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[2fr_3fr]">
          <div
            className="flex flex-col gap-3"
            role="tablist"
            aria-label="How ZEGA works"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {STEPS.map((step, i) => (
              <button
                key={step.title}
                type="button"
                role="tab"
                aria-selected={active === i}
                onClick={() => setActive(i)}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-5 text-left transition-all",
                  active === i ? "bg-card shadow-md" : "hover:bg-card/60 border-transparent opacity-70",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                      active === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                </div>
                <p className="text-muted-foreground mt-2 pl-10 text-sm">{step.body}</p>
                {active === i && (
                  <span
                    key={`${active}-${paused}`}
                    aria-hidden="true"
                    className="bg-primary absolute bottom-0 left-0 h-0.5"
                    style={{
                      animation: paused ? "none" : `zega-progress ${DURATION}ms linear forwards`,
                      width: paused ? "100%" : undefined,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
          <LandingVideo key={STEPS[active].slot.id} slot={STEPS[active].slot} fallback={STEPS[active].mock} />
        </div>
      </div>
    </section>
  );
}
