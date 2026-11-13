"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { keys } from "@/lib/queries";

type Status = "connecting" | "live" | "offline";
const LiveContext = createContext<Status>("connecting");
/** Connection state of the live stream (available to components that want to show it). */
export const useLiveStatus = () => useContext(LiveContext);

/**
 * Subscribes to /api/events (Server-Sent Events backed by Postgres LISTEN/NOTIFY) and refreshes
 * exactly the cached data an event affects. EventSource reconnects on its own; after a reconnect
 * everything is refetched once so nothing missed while offline stays stale.
 */
export function LiveUpdates({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    let source: EventSource | null = null;
    let wasLive = false;
    let closed = false;

    const open = () => {
      source = new EventSource("/api/events", { withCredentials: true });
      source.addEventListener("ready", () => {
        setStatus("live");
        if (wasLive) void qc.invalidateQueries();
        wasLive = true;
      });
      source.addEventListener("request", (ev) => {
        const e = JSON.parse((ev as MessageEvent<string>).data) as { requestId: string; refCode: string };
        void qc.invalidateQueries({ queryKey: keys.detail(e.refCode) });
        void qc.invalidateQueries({ queryKey: keys.detail(e.requestId) });
        void qc.invalidateQueries({ queryKey: keys.timeline(e.refCode) });
        void qc.invalidateQueries({ queryKey: [...keys.requests, "list"] });
        void qc.invalidateQueries({ queryKey: ["reports"] });
      });
      source.addEventListener("notification", () => {
        void qc.invalidateQueries({ queryKey: keys.notifications });
      });
      source.onerror = () => {
        if (closed) return;
        setStatus(navigator.onLine ? "connecting" : "offline");
      };
    };

    open();
    const online = () => setStatus((s) => (s === "offline" ? "connecting" : s));
    const offline = () => setStatus("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      closed = true;
      source?.close();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [qc]);

  return <LiveContext.Provider value={status}>{children}</LiveContext.Provider>;
}
