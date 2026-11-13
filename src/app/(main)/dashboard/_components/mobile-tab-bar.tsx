"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";
import {
  ClipboardList,
  FileBarChart,
  House,
  type LucideIcon,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

import type { RoleSlug } from "@/domain/constants";

type Tab = { href: string; label: string; icon: LucideIcon; prominent?: boolean; exact?: boolean };

/**
 * Bottom tab bar for phones (Apple HIG: 3 to 5 top-level destinations, labelled icons, 44pt+
 * targets, clear of the home indicator). Everything else lives in the sidebar.
 */
const TABS: Record<RoleSlug, Tab[]> = {
  student: [
    { href: "/dashboard", label: "Home", icon: House, exact: true },
    { href: "/dashboard/requests", label: "Requests", icon: ClipboardList, exact: true },
    { href: "/dashboard/requests/new", label: "Report", icon: Plus, prominent: true },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
  staff: [
    { href: "/dashboard", label: "Home", icon: House, exact: true },
    { href: "/dashboard/requests", label: "Requests", icon: ClipboardList, exact: true },
    { href: "/dashboard/requests/new", label: "Report", icon: Plus, prominent: true },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
  officer: [
    { href: "/dashboard", label: "Home", icon: House, exact: true },
    { href: "/dashboard/work", label: "Work", icon: Wrench },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
  admin: [
    { href: "/dashboard", label: "Home", icon: House, exact: true },
    { href: "/dashboard/admin/requests", label: "Requests", icon: ClipboardList },
    { href: "/dashboard/admin/users", label: "Users", icon: Users },
    { href: "/dashboard/admin/reports", label: "Reports", icon: FileBarChart },
    { href: "/dashboard/admin/audit", label: "Audit", icon: ShieldCheck },
  ],
};

export function MobileTabBar({ role }: { role: RoleSlug }) {
  const path = usePathname();
  const tabs = TABS[role];
  const active = (t: Tab) => (t.exact ? path === t.href : path === t.href || path.startsWith(`${t.href}/`));

  return (
    <nav
      aria-label="Main"
      className="bg-background fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {tabs.map((t) => {
          const on = active(t);
          return (
            <li key={t.href} className="flex flex-1 justify-center">
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  on ? "text-primary" : "text-muted-foreground",
                )}
              >
                {t.prominent ? (
                  <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full">
                    <t.icon className="size-5" strokeWidth={2.5} />
                  </span>
                ) : (
                  <span className="flex size-8 items-center justify-center">
                    <t.icon className="size-5" strokeWidth={on ? 2.5 : 2} />
                  </span>
                )}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
