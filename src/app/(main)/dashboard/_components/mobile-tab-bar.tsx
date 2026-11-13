"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";
import {
  Bell,
  ClipboardList,
  FileBarChart,
  House,
  type LucideIcon,
  Plus,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

import { useNotifications } from "@/components/live/notification-bell";
import type { RoleSlug } from "@/domain/constants";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  prominent?: boolean;
  exact?: boolean;
  /** Shows the unread notification count. */
  badge?: boolean;
};

const ALERTS: Tab = { href: "/dashboard/notifications", label: "Alerts", icon: Bell, badge: true };

/**
 * Bottom tab bar for phones (Apple HIG: 3 to 5 top-level destinations, labelled icons, 44pt+
 * targets, clear of the home indicator). Notifications live here instead of the top bar, and the
 * report action sits in the centre for requesters. Everything else lives in the sidebar.
 */
const TABS: Record<RoleSlug, Tab[]> = {
  student: [
    { href: "/dashboard", label: "Home", icon: House, exact: true },
    { href: "/dashboard/requests", label: "Requests", icon: ClipboardList, exact: true },
    { href: "/dashboard/requests/new", label: "Report", icon: Plus, prominent: true },
    ALERTS,
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
  staff: [
    { href: "/dashboard", label: "Home", icon: House, exact: true },
    { href: "/dashboard/requests", label: "Requests", icon: ClipboardList, exact: true },
    { href: "/dashboard/requests/new", label: "Report", icon: Plus, prominent: true },
    ALERTS,
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
  officer: [
    { href: "/dashboard", label: "Home", icon: House, exact: true },
    { href: "/dashboard/work", label: "Work", icon: Wrench },
    ALERTS,
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
  admin: [
    { href: "/dashboard", label: "Home", icon: House, exact: true },
    { href: "/dashboard/admin/requests", label: "Requests", icon: ClipboardList },
    { href: "/dashboard/admin/users", label: "Users", icon: Users },
    ALERTS,
    { href: "/dashboard/admin/reports", label: "Reports", icon: FileBarChart },
  ],
};

export function MobileTabBar({ role }: { role: RoleSlug }) {
  const path = usePathname();
  const tabs = TABS[role];
  const unread = useNotifications().data?.unread ?? 0;
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
                  <span className="relative flex size-8 items-center justify-center">
                    <t.icon className="size-5" strokeWidth={on ? 2.5 : 2} />
                    {t.badge && unread > 0 && (
                      <span className="bg-destructive absolute -top-0.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </span>
                )}
                {t.label}
                {t.badge && unread > 0 && <span className="sr-only">, {unread} unread</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
