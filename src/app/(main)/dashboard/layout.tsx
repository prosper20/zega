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
              "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
              // Solid sticky bar (no translucency or blur).
              "bg-background sticky top-0 z-50 rounded-t-[inherit]",
            )}
          >
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-1 lg:gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
                />
                <SearchDialog role={user.role} />
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <UserMenu user={user} />
              </div>
            </div>
          </header>
          {/* Pages can set data-content-padding="false" to render full-bleed app layouts. */}
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </LiveUpdates>
  );
}
