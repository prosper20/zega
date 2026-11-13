import type { CurrentUser } from "@/server/session-types";

/** Payloads published by the database triggers on the `zega_events` channel. */
export type ZegaEvent =
  | {
      type: "request.status";
      requestId: string;
      refCode: string;
      status: string;
      requesterId: string;
      assigneeId: string | null;
      at: string;
    }
  | { type: "notification"; id: string; userId: string; requestId: string | null };

export type EventBus = {
  subscribe: (listener: (event: ZegaEvent) => void) => () => void;
};

/** Who may receive an event: admins see every request change; others only requests they are part of. */
export function canReceive(user: CurrentUser, e: ZegaEvent) {
  if (e.type === "notification") return e.userId === user.id;
  return user.role === "admin" || e.requesterId === user.id || e.assigneeId === user.id;
}

export function parseEvent(payload: string | undefined): ZegaEvent | null {
  if (!payload) return null;
  try {
    const e = JSON.parse(payload);
    return e && (e.type === "request.status" || e.type === "notification") ? (e as ZegaEvent) : null;
  } catch {
    return null;
  }
}

/** Tiny fan-out used by every bus implementation. */
export function createFanout() {
  const listeners = new Set<(e: ZegaEvent) => void>();
  return {
    listeners,
    emit: (e: ZegaEvent) => {
      for (const l of listeners) {
        try {
          l(e);
        } catch (err) {
          console.error("[events] listener failed", err);
        }
      }
    },
    subscribe: (l: (e: ZegaEvent) => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
