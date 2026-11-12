"use client";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

/** Signs out, clears client caches and returns to the login page. */
export function useSignOut() {
  const router = useRouter();
  return async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("Could not sign out. Please try again.");
      return;
    }
    toast.success("Signed out");
    router.replace("/auth/login");
    router.refresh();
  };
}
