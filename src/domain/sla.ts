import type { RequestStatus } from "./constants";

export type SlaPolicy = { responseMinutes: number; resolutionMinutes: number };

export type SlaState = "met" | "on_track" | "at_risk" | "breached" | "none";

const MINUTE = 60_000;
/** Fraction of the window remaining below which a request is flagged as at risk. */
export const AT_RISK_THRESHOLD = 0.25;

export function computeDueDates(createdAt: Date, policy: SlaPolicy) {
  return {
    responseDueAt: new Date(createdAt.getTime() + policy.responseMinutes * MINUTE),
    resolutionDueAt: new Date(createdAt.getTime() + policy.resolutionMinutes * MINUTE),
  };
}

/** Resolution SLA state of a request at `now`. */
export function resolutionSlaState(
  r: { createdAt: Date; resolutionDueAt: Date | null; resolvedAt: Date | null; status: RequestStatus },
  now: Date = new Date(),
): SlaState {
  if (!r.resolutionDueAt || r.status === "rejected" || r.status === "cancelled") return "none";
  if (r.resolvedAt) return r.resolvedAt <= r.resolutionDueAt ? "met" : "breached";
  if (now > r.resolutionDueAt) return "breached";
  const total = r.resolutionDueAt.getTime() - r.createdAt.getTime();
  const remaining = r.resolutionDueAt.getTime() - now.getTime();
  return total > 0 && remaining / total < AT_RISK_THRESHOLD ? "at_risk" : "on_track";
}

/** Response SLA: met once someone first acts on the request (triage, assignment...). */
export function responseSlaState(
  r: { responseDueAt: Date | null; firstResponseAt: Date | null },
  now: Date = new Date(),
): SlaState {
  if (!r.responseDueAt) return "none";
  if (r.firstResponseAt) return r.firstResponseAt <= r.responseDueAt ? "met" : "breached";
  return now > r.responseDueAt ? "breached" : "on_track";
}

/** Human-friendly "3h 12m" style duration. */
export function formatDuration(ms: number) {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / MINUTE);
  if (d > 0) return `${sign}${d}d ${h}h`;
  if (h > 0) return `${sign}${h}h ${m}m`;
  return `${sign}${m}m`;
}
