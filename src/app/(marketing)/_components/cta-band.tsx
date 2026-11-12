import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="bg-sidebar text-sidebar-foreground relative mx-auto max-w-7xl overflow-hidden rounded-3xl px-6 py-16 text-center sm:py-20">
        <div
          aria-hidden="true"
          className="bg-sidebar-primary/30 absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full blur-3xl"
        />
        <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Something broken on campus?
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-lg opacity-80">
          Report it in under a minute and follow it all the way to resolved.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="bg-sidebar-primary text-sidebar-primary-foreground h-11 px-6 text-base">
            <Link href="/auth/register">
              Get started <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-sidebar-border hover:bg-sidebar-accent h-11 bg-transparent px-6 text-base text-white hover:text-white"
          >
            <Link href="/auth/login">Log in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
