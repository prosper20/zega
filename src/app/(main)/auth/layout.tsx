import type { ReactNode } from "react";

import Image from "next/image";
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
        <div className="bg-sidebar text-sidebar-foreground order-2 hidden h-full flex-col rounded-xl p-10 lg:flex">
          <div className="space-y-2">
            <AppLogo className="text-sidebar-primary size-10" />
            <h1 className="text-2xl font-semibold tracking-tight">{APP_CONFIG.name}</h1>
            <p className="text-sm">{APP_CONFIG.tagline}</p>
          </div>

          <div className="relative my-8 min-h-0 flex-1 overflow-hidden rounded-lg">
            <Image
              src="/images/auth-campus.jpg"
              alt="University campus buildings"
              fill
              priority
              sizes="50vw"
              className="object-cover"
            />
          </div>

          <div className="flex w-full justify-between">
            <div className="flex-1 space-y-1">
              <h2 className="font-medium">Scan. Report. Done.</h2>
              <p className="text-sm opacity-80">
                Scan the QR sticker in any room or hostel to report a fault in seconds, with photos.
              </p>
            </div>
            <Separator orientation="vertical" className="bg-sidebar-border mx-3 h-auto!" />
            <div className="flex-1 space-y-1">
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
