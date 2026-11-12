import Link from "next/link";

import { ArrowRight, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LandingVideo } from "./landing-video";
import { MEDIA } from "./media";
import { HeroMock } from "./ui-mocks";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="from-accent/80 via-background to-background absolute inset-0 -z-10 bg-gradient-to-b"
      />
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
        <a
          href="#how-it-works"
          className="bg-card text-muted-foreground hover:text-foreground mx-auto mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-xs"
        >
          <QrCode className="text-primary size-3.5" /> Scan a room's QR code and report in seconds
          <ArrowRight className="size-3" />
        </a>
        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Campus maintenance, <span className="text-primary">reported, tracked and resolved.</span>
        </h1>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-pretty">
          No more phone calls, paper forms or lost WhatsApp messages. ZEGA gives students, staff, maintenance officers
          and administrators one accountable place for every faulty socket, leaking pipe and broken chair.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="h-11 px-6 text-base">
            <Link href="/auth/register">
              Report an issue <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-6 text-base">
            <Link href="/auth/login">Track my request</Link>
          </Button>
        </div>
        <LandingVideo slot={MEDIA.hero} fallback={<HeroMock />} className="mx-auto mt-14 max-w-5xl" />
      </div>
    </section>
  );
}
