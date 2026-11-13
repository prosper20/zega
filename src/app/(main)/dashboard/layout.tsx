import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { cn } from "cn";
import type { Metadata } from "next";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { LiveUpdates } from "@/components/live/live-updates";
import { NotificationBell } from "@/components/live/notification-bell";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getPreference } from "@/server/server-actions";
import { requireUser } from "@/server/session";

import { SearchDialog } from "./_components/header/search-dialog";
import { UserMenu } from "./_components/header/user-menu";
import { MobileTabBar } from "./_components/mobile-tab-bar";
import type { ShellUser } from "./_components/user-types";

/** The app behind sign-in is private: keep every dashboard page out of search engines. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const current = await requireUser();
  const user: ShellUser = {
    id: current.id,
    name: current.name,
    email: current.email,
    image: current.image,
    role: current.role,
  };
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const [variant, collapsible] = await Promise.all([
    getPreference("sidebar_variant"),
    getPreference("sidebar_collapsible"),
  ]);

  return (
    <LiveUpdates>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 68)",
          } as React.CSSProperties
        }
      >
        <AppSidebar user={user} variant={variant} collapsible={collapsible} />
        <SidebarInset
          className={cn(
            "[html[data-content-layout=centered]_&>*]:mx-auto",
            "[html[data-content-layout=centered]_&>*]:w-full",
            "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
            "peer-data-[variant=inset]:border",
            "[--dashboard-header-height:--spacing(12)]",
            "min-w-0 overflow-x-clip",
          )}
        >
          <header
            className={cn(
              "flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:h-12",
              // Solid sticky bar (no translucency or blur).
              "bg-background sticky top-0 z-50 rounded-t-[inherit]",
            )}
          >
            {/* Phones: sidebar icon, a search field filling the width, then notifications. */}
            <div className="flex w-full items-center gap-2 px-3 md:justify-between md:px-4 lg:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none lg:gap-2">
                <SidebarTrigger className="-ml-1 size-10 md:size-7" />
                <Separator
                  orientation="vertical"
                  className="mx-2 hidden data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center md:block"
                />
                <div className="min-w-0 flex-1">
                  <SearchDialog role={user.role} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* On phones notifications are a tab in the bottom bar; the bell stays mounted for live toasts. */}
                <div className="hidden md:block">
                  <NotificationBell />
                </div>
                <div className="hidden md:block">
                  <UserMenu user={user} />
                </div>
              </div>
            </div>
          </header>
          {/* Pages can set data-content-padding="false" to render full-bleed app layouts. */}
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] has-data-[content-padding=false]:p-0 md:p-6 md:pb-6 md:has-data-[content-padding=false]:p-0">
            {children}
          </div>
          <MobileTabBar role={user.role} />
        </SidebarInset>
      </SidebarProvider>
    </LiveUpdates>
  );
}
