"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import { cn } from "cn";

import { Button } from "@/components/ui/button";

import { FaultToFixedVideo } from "./fault-to-fixed-video";

const STEPS = [
  {
    title: "Report it in seconds",
    body: "Scan the QR sticker in any room or hostel. Location fills itself in, similar open reports are flagged, and a photo shows exactly what is wrong.",
    screen: "/images/phone-report.webp",
    alt: "ZEGA on a phone: step 1 of the report form, choosing what kind of problem it is",
  },
  {
    title: "Track it live",
    body: "Admins assign the best officer in one click from suggestions ranked by skill and workload, and every change reaches you instantly.",
    screen: "/images/phone-track.webp",
    alt: "ZEGA on a phone: a request's tracking page with its status steps and details",
  },
  {
    title: "Resolve it for good",
    body: "Officers close jobs with notes and an after-photo. You confirm the fix and rate it, or reopen it if the problem comes back.",
    screen: "/images/phone-resolve.webp",
    alt: "ZEGA on a phone: an officer's work orders with a Move button on each job",
  },
];

const DURATION = 7000;

/** MaintainX-style showcase: a looping video panel under the phone mock, and three auto-advancing steps. */
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
            From fault to <span className="text-primary">fixed</span>, on the record
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Every request follows the same accountable path, so nothing gets lost between a phone call and a repair.
          </p>
        </div>

        <div className="bg-sidebar relative mt-12 flex h-[360px] items-start justify-center overflow-hidden rounded-xl sm:h-[420px]">
          <FaultToFixedVideo />
          <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
          <div
            key={step.screen}
            className="animate-in fade-in slide-in-from-bottom-4 relative mt-10 w-[220px] overflow-hidden rounded-[2rem] border-[6px] border-white/80 bg-white shadow-lg duration-500 sm:w-[250px]"
          >
            <Image
              src={step.screen}
              alt={step.alt}
              width={520}
              height={885}
              sizes="250px"
              className="block h-auto w-full"
            />
          </div>
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
