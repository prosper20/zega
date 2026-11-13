import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { MEDIA } from "./media";

/** Full-bleed closing call to action. Plays MEDIA.ctaBackground behind a navy overlay once a recording exists. */
export function CtaBand() {
  const bg = MEDIA.ctaBackground as { src?: string; poster?: string };
  return (
    <section className="bg-sidebar relative isolate overflow-hidden text-white">
      {bg.src ? (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <video
            className="h-full w-full object-cover opacity-30"
            src={bg.src}
            poster={bg.poster}
            autoPlay
            muted
            loop
            playsInline
          />
        </div>
      ) : (
        <>
          <div aria-hidden="true" className="bg-blueprint absolute inset-0 -z-10 opacity-70" />
        </>
      )}
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 sm:py-32">
        <h2 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">Something broken on campus?</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
          Report it in under a minute and follow it all the way to resolved.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="text-primary h-12 bg-white px-6 text-base font-semibold hover:bg-white/90">
            <Link href="/auth/register">
              Create your account <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 border-2 border-white bg-transparent px-6 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/auth/login">Log in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
