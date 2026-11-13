import Link from "next/link";

import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { LoginForm } from "../_components/login-form";
import { safeNext } from "../_components/safe-next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to report, track and resolve campus maintenance requests.",
  alternates: { canonical: "/auth/login" },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 px-4 sm:w-[380px] sm:px-0">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Log in to ZEGA</h1>
          <p className="text-muted-foreground text-sm">Report, track and resolve campus maintenance requests.</p>
        </div>
        <LoginForm next={safeNext(next)} />
      </div>

      <div className="absolute top-5 flex w-full justify-end px-6 sm:px-10">
        <div className="text-muted-foreground text-sm">
          New to ZEGA?{" "}
          <Link prefetch={false} className="text-primary font-medium" href="/auth/register">
            Create an account
          </Link>
        </div>
      </div>

      <div className="text-muted-foreground absolute bottom-5 flex w-full justify-between px-6 text-sm sm:px-10">
        <Link href="/" className="hover:text-foreground">
          ← Back to home
        </Link>
        <span>{APP_CONFIG.copyright}</span>
      </div>
    </>
  );
}
