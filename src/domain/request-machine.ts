import type { RequestStatus, RoleSlug } from "./constants";

/**
 * Who is acting on a request, relative to that request:
 * - requester: the user who reported it
 * - assignee: the officer currently assigned
 * - admin: any administrator
 * - system: automated jobs (SLA cron, auto-close)
 */
export type Actor = "requester" | "assignee" | "admin" | "system";

export type TransitionRule = {
  to: RequestStatus;
  by: readonly Actor[];
  /** UI label for the action button. */
  label: string;
  /** Whether a note must accompany the transition (reason, resolution summary...). */
  requiresNote?: boolean;
  /** Whether the request must have an assignee before this transition. */
  requiresAssignee?: boolean;
};

/**
 * The single source of truth for the request lifecycle. The API enforces it and the UI
 * renders only the actions it allows, so the two can never disagree.
 */
export const TRANSITIONS: Readonly<Record<RequestStatus, readonly TransitionRule[]>> = {
  submitted: [
    { to: "triaged", by: ["admin"], label: "Mark as triaged" },
    { to: "assigned", by: ["admin"], label: "Assign", requiresAssignee: true },
    { to: "rejected", by: ["admin"], label: "Reject", requiresNote: true },
    { to: "cancelled", by: ["requester", "admin"], label: "Cancel request" },
  ],
  triaged: [
    { to: "assigned", by: ["admin"], label: "Assign", requiresAssignee: true },
    { to: "rejected", by: ["admin"], label: "Reject", requiresNote: true },
    { to: "cancelled", by: ["requester", "admin"], label: "Cancel request" },
  ],
  assigned: [
    { to: "in_progress", by: ["assignee", "admin"], label: "Start work", requiresAssignee: true },
    { to: "on_hold", by: ["assignee", "admin"], label: "Put on hold", requiresNote: true },
    { to: "cancelled", by: ["requester", "admin"], label: "Cancel request" },
  ],
  in_progress: [
    { to: "on_hold", by: ["assignee", "admin"], label: "Put on hold", requiresNote: true },
    { to: "resolved", by: ["assignee", "admin"], label: "Mark resolved", requiresNote: true },
  ],
  on_hold: [
    { to: "in_progress", by: ["assignee", "admin"], label: "Resume work" },
    { to: "cancelled", by: ["admin"], label: "Cancel request", requiresNote: true },
  ],
  resolved: [
    { to: "closed", by: ["requester", "admin", "system"], label: "Confirm fix" },
    { to: "reopened", by: ["requester", "admin"], label: "Reopen", requiresNote: true },
  ],
  reopened: [
    { to: "assigned", by: ["admin"], label: "Reassign", requiresAssignee: true },
    { to: "in_progress", by: ["assignee", "admin"], label: "Start work", requiresAssignee: true },
  ],
  closed: [],
  rejected: [],
  cancelled: [],
};

export type TransitionContext = {
  status: RequestStatus;
  userId: string | null;
  role: RoleSlug | "system";
  requesterId: string;
  assigneeId: string | null;
};

/** Every relationship the user has to this request (a user can be both requester and admin). */
export function actorsFor(ctx: Omit<TransitionContext, "status">): Actor[] {
  if (ctx.role === "system") return ["system"];
  const actors: Actor[] = [];
  if (ctx.role === "admin") actors.push("admin");
  if (ctx.userId && ctx.userId === ctx.requesterId) actors.push("requester");
  if (ctx.userId && ctx.role === "officer" && ctx.userId === ctx.assigneeId) actors.push("assignee");
  return actors;
}

/** Transitions the given user may perform right now. */
export function availableTransitions(ctx: TransitionContext): TransitionRule[] {
  const actors = actorsFor(ctx);
  return TRANSITIONS[ctx.status].filter(
    (rule) =>
      rule.by.some((a) => actors.includes(a)) &&
      (!rule.requiresAssignee || ctx.assigneeId !== null || rule.to === "assigned"),
  );
}

export type TransitionCheck =
  | { ok: true; rule: TransitionRule }
  | { ok: false; reason: "invalid_transition" | "forbidden" | "note_required" | "assignee_required" };

/** Validates a requested transition. `assigneeId` should reflect the state after any assignment in the same action. */
export function checkTransition(ctx: TransitionContext, to: RequestStatus, note?: string | null): TransitionCheck {
  const rule = TRANSITIONS[ctx.status].find((r) => r.to === to);
  if (!rule) return { ok: false, reason: "invalid_transition" };
  const actors = actorsFor(ctx);
  if (!rule.by.some((a) => actors.includes(a))) return { ok: false, reason: "forbidden" };
  if (rule.requiresNote && !note?.trim()) return { ok: false, reason: "note_required" };
  if (rule.requiresAssignee && !ctx.assigneeId) return { ok: false, reason: "assignee_required" };
  return { ok: true, rule };
}

export function isTerminal(status: RequestStatus) {
  return TRANSITIONS[status].length === 0;
}
