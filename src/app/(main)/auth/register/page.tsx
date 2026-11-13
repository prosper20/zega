import Link from "next/link";

import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { RegisterForm } from "../_components/register-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Students and staff can create a ZEGA account to report and track maintenance requests.",
  alternates: { canonical: "/auth/register" },
};

export default function RegisterPage() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 px-4 py-20 sm:w-[440px] sm:px-0">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-muted-foreground text-sm">Report faults on campus and follow them until they are fixed.</p>
        </div>
        <RegisterForm />
      </div>

      <div className="absolute top-5 flex w-full justify-end px-6 sm:px-10">
        <div className="text-muted-foreground text-sm">
          Already registered?{" "}
          <Link prefetch={false} className="text-primary font-medium" href="/auth/login">
            Log in
          </Link>
        </div>
      </div>
    </>
  );
}
