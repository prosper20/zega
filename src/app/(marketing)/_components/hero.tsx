import Image from "next/image";
import Link from "next/link";

import { ArrowRight, Fingerprint, Radio, ShieldCheck, TrendingDown, TrendingUp, Webhook } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LandingVideo } from "./landing-video";
import { MEDIA } from "./media";
import { HeroMock } from "./ui-mocks";

const TRUST = [
  { icon: ShieldCheck, label: "Role-based access" },
  { icon: Fingerprint, label: "Tamper-evident audit trail" },
  { icon: Radio, label: "Live status updates" },
  { icon: Webhook, label: "Documented REST API" },
];

function StatCard({
  label,
  value,
  trend,
  className,
}: {
  label: string;
  value: string;
  trend: "up" | "down";
  className?: string;
}) {
  const Icon = trend === "up" ? TrendingUp : TrendingDown;
  return (
    <div
      className={`bg-card text-card-foreground absolute z-10 hidden rounded-xl border p-4 shadow-lg sm:block ${className ?? ""}`}
    >
      <div className="text-muted-foreground text-sm font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-3xl font-bold tracking-tight tabular-nums">{value}</span>
        <Icon className="size-7 text-emerald-500" strokeWidth={2.5} />
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="bg-primary text-primary-foreground relative overflow-hidden">
      <Image src="/images/hero-campus.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />
      <div aria-hidden="true" className="bg-primary/70 absolute inset-0" />
      <div aria-hidden="true" className="bg-blueprint absolute inset-0 opacity-50" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl xl:text-6xl">
            Campus maintenance, reported, tracked and resolved.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-white/85">
            No more phone calls, paper forms or lost WhatsApp messages. ZEGA gives students, staff, maintenance officers
            and administrators one accountable place for every faulty socket, leaking pipe and broken chair.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="text-primary h-12 bg-white px-6 text-base font-semibold hover:bg-white/90">
              <Link href="/auth/register">
                Report an issue <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 border-2 border-white bg-transparent px-6 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/auth/login">Track my request</Link>
            </Button>
          </div>
          <ul className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {TRUST.map((t) => (
              <li
                key={t.label}
                className="flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm font-medium"
              >
                <t.icon className="size-4 shrink-0" /> {t.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative lg:pl-6">
          <LandingVideo
            slot={MEDIA.hero}
            fallback={<HeroMock />}
            chrome={false}
            className="border-white/20 shadow-black/30"
          />
          <StatCard label="Avg. resolution time" value="6.4h" trend="down" className="-top-8 left-0 lg:-left-6" />
          <StatCard label="SLA targets met" value="95%" trend="up" className="right-0 -bottom-8 lg:-right-6" />
        </div>
      </div>
    </section>
  );
}
