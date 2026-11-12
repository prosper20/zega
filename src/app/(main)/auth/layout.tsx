import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AppLogo } from "@/components/app-logo";
import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";
import { getCurrentUser } from "@/server/session";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  // A real session check (not just a cookie) so expired cookies never cause a redirect loop.
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="bg-sidebar relative order-2 hidden h-full rounded-3xl lg:flex">
          <div className="text-sidebar-foreground absolute top-10 space-y-2 px-10">
            <AppLogo className="text-sidebar-primary size-10" />
            <h1 className="text-2xl font-semibold tracking-tight">{APP_CONFIG.name}</h1>
            <p className="text-sm">{APP_CONFIG.tagline}</p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="text-sidebar-foreground flex-1 space-y-1">
              <h2 className="font-medium">Scan. Report. Done.</h2>
              <p className="text-sm opacity-80">
                Scan the QR sticker in any room or hostel to report a fault in seconds, with photos.
              </p>
            </div>
            <Separator orientation="vertical" className="bg-sidebar-border mx-3 h-auto!" />
            <div className="text-sidebar-foreground flex-1 space-y-1">
              <h2 className="font-medium">Every step on record</h2>
              <p className="text-sm opacity-80">
                Live status updates, SLA timers and a tamper-evident audit trail for every request.
              </p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
