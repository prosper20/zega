import Link from "next/link";

import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Access denied | ZEGA", robots: { index: false, follow: false } };

export default function UnauthorizedPage() {
  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-md text-center">
        <ShieldAlert className="text-primary mx-auto size-12" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">You don&apos;t have access to this page</h1>
        <p className="text-muted-foreground mt-4">
          This area is for a different role. If you think you should have access, ask a ZEGA administrator to update
          your account.
        </p>
        <Button asChild className="mt-6 h-10 px-5">
          <Link href="/dashboard">Back to my dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
