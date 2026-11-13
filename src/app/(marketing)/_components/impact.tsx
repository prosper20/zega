import { cn } from "cn";
import { ArrowUpRight, Fingerprint, MousePointerClick, QrCode, Radio } from "lucide-react";

const CARDS = [
  {
    stat: "< 60s",
    sub: "to report a fault with a QR scan",
    icon: QrCode,
    href: "#how-it-works",
    tone: "bg-primary",
  },
  {
    stat: "100%",
    sub: "of actions recorded on the audit trail",
    icon: Fingerprint,
    href: "#features",
    tone: "bg-sidebar",
  },
  {
    stat: "1 click",
    sub: "to assign the right officer",
    icon: MousePointerClick,
    href: "#roles",
    tone: "bg-secondary-foreground",
  },
  {
    stat: "Live",
    sub: "status updates, no refreshing",
    icon: Radio,
    href: "#features",
    tone: "bg-emerald-700",
  },
];

/** MaintainX "case studies" pattern: tall cards with a big stat, subline and arrow. */
export function Impact() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-primary text-xs font-bold tracking-widest uppercase">Why ZEGA</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Built to end lost complaints, slow fixes and finger-pointing
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CARDS.map((c) => (
            <a
              key={c.stat}
              href={c.href}
              className={cn(
                "group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl p-5 text-white transition-colors hover:brightness-110",
                c.tone,
              )}
            >
              <c.icon
                aria-hidden="true"
                strokeWidth={1}
                className="absolute -right-6 -bottom-6 size-44 text-white/10 transition-transform duration-500 group-hover:scale-110"
              />
              <div className="relative">
                <div className="text-3xl font-bold tracking-tight sm:text-4xl">{c.stat}</div>
                <div className="mt-1 text-sm font-medium text-white/85">{c.sub}</div>
              </div>
              <ArrowUpRight className="relative ml-auto size-6 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
