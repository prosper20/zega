"use client";

import Link from "next/link";

import { AppLogo } from "@/components/app-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { sidebarItemsForRole } from "@/navigation/sidebar/sidebar-items";

import type { ShellUser } from "../user-types";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: ShellUser }) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={false} href="/dashboard">
                <AppLogo className="text-sidebar-primary size-6" />
                <span className="text-base font-semibold tracking-tight">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItemsForRole(user.role)} role={user.role} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
