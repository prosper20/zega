import Link from "next/link";

import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app-config";

const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#roles", label: "Who it's for" },
  { href: "#features", label: "Features" },
  { href: "/api/docs", label: "API" },
];

export function SiteHeader() {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <AppLogo className="size-8" />
          <span className="text-lg font-bold tracking-tight">{APP_CONFIG.name}</span>
        </Link>
        <nav className="text-muted-foreground hidden items-center gap-6 text-sm font-medium md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" className="h-9 px-3">
            <Link href="/auth/login">Log in</Link>
          </Button>
          <Button asChild className="h-9 px-4">
            <Link href="/auth/register">Report an issue</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
