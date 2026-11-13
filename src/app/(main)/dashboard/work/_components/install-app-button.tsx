"use client";

import { useEffect, useState } from "react";

import { Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Offers "Add to Home Screen" when the browser allows it, so officers can open jobs like a native app. */
export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (!prompt) return null;
  return (
    <Button
      variant="outline"
      className="h-9"
      onClick={async () => {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") toast.success("ZEGA installed on this device");
        setPrompt(null);
      }}
    >
      <Smartphone data-icon="inline-start" /> Install app
    </Button>
  );
}
