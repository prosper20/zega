import Link from "next/link";

import { ZegaWordmark } from "@/components/app-logo";
import { APP_CONFIG } from "@/config/app-config";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Report an issue", href: "/auth/register" },
      { label: "Track a request", href: "/auth/login" },
      { label: "Officer work orders", href: "/auth/login" },
      { label: "Admin console", href: "/auth/login" },
    ],
  },
  {
    title: "Features",
    links: [
      { label: "SLA timers", href: "/#features" },
      { label: "Audit trail", href: "/#features" },
      { label: "Reports & exports", href: "/#features" },
      { label: "Real-time updates", href: "/#features" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "API docs", href: "/api/docs" },
      { label: "OpenAPI spec", href: "/api/openapi.json" },
      { label: "Postman collection", href: "/api/postman.json" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/auth/login" },
      { label: "Register", href: "/auth/register" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-background border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <ZegaWordmark variant="navy" compact className="h-6 w-auto" />
          <p className="text-muted-foreground mt-4 max-w-xs text-sm">
            {APP_CONFIG.tagline} The service request platform for university maintenance.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-bold tracking-widest uppercase">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-6 text-xs sm:flex-row sm:px-6">
          <p>{APP_CONFIG.copyright} All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
