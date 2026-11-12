import {
  Bell,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  PlusCircle,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

import type { RoleSlug } from "@/domain/constants";

export type { RoleSlug };

export type NavBadge = "new" | "updated" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
  roles?: readonly RoleSlug[];
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
  /** Roles allowed to see this item. Omitted = every signed-in user. */
  roles?: readonly RoleSlug[];
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  roles?: readonly RoleSlug[];
  items: NavMainItem[];
}

const REQUESTERS = ["student", "staff"] as const;

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Overview",
    items: [
      { id: "overview", title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { id: "notifications", title: "Notifications", url: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    id: 2,
    label: "Requests",
    roles: REQUESTERS,
    items: [
      { id: "new-request", title: "Report an issue", url: "/dashboard/requests/new", icon: PlusCircle },
      { id: "my-requests", title: "My requests", url: "/dashboard/requests", icon: ClipboardList },
    ],
  },
  {
    id: 3,
    label: "Work",
    roles: ["officer"],
    items: [{ id: "work", title: "My work orders", url: "/dashboard/work", icon: Wrench }],
  },
  {
    id: 4,
    label: "Administration",
    roles: ["admin"],
    items: [
      { id: "admin-requests", title: "All requests", url: "/dashboard/admin/requests", icon: ClipboardList },
      { id: "admin-users", title: "Users & roles", url: "/dashboard/admin/users", icon: Users },
      { id: "admin-locations", title: "Locations & QR", url: "/dashboard/admin/locations", icon: MapPin },
      { id: "admin-settings", title: "Categories & SLAs", url: "/dashboard/admin/settings", icon: Settings2 },
      { id: "admin-reports", title: "Reports", url: "/dashboard/admin/reports", icon: FileBarChart },
      { id: "admin-audit", title: "Audit trail", url: "/dashboard/admin/audit", icon: ShieldCheck },
    ],
  },
  {
    id: 5,
    label: "Account",
    items: [
      { id: "profile", title: "Profile & sessions", url: "/dashboard/profile", icon: UserRound },
      { id: "api-docs", title: "API docs", url: "/api/docs", icon: ScrollText, newTab: true },
    ],
  },
];

/** Returns only the groups/items the given role may see. */
export function sidebarItemsForRole(role: RoleSlug): NavGroup[] {
  const allowed = (roles?: readonly RoleSlug[]) => !roles || roles.includes(role);
  return sidebarItems
    .filter((group) => allowed(group.roles))
    .map((group) => ({ ...group, items: group.items.filter((item) => allowed(item.roles)) }))
    .filter((group) => group.items.length > 0);
}
