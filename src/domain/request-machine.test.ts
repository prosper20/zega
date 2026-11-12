import { describe, expect, it } from "vitest";

import { REQUEST_STATUSES, type RequestStatus } from "./constants";
import {
  availableTransitions,
  checkTransition,
  isTerminal,
  TRANSITIONS,
  type TransitionContext,
} from "./request-machine";

const base = (over: Partial<TransitionContext> = {}): TransitionContext => ({
  status: "submitted",
  userId: "u-student",
  role: "student",
  requesterId: "u-student",
  assigneeId: null,
  ...over,
});

describe("request state machine", () => {
  it("defines rules for every status and only terminal states have none", () => {
    for (const s of REQUEST_STATUSES) expect(TRANSITIONS[s]).toBeDefined();
    expect(REQUEST_STATUSES.filter(isTerminal)).toEqual(["closed", "rejected", "cancelled"]);
  });

  it("lets the requester cancel a new request but not triage it", () => {
    expect(checkTransition(base(), "cancelled").ok).toBe(true);
    expect(checkTransition(base(), "triaged")).toEqual({ ok: false, reason: "forbidden" });
  });

  it("blocks transitions that skip the lifecycle", () => {
    expect(checkTransition(base({ role: "admin", userId: "u-admin" }), "resolved")).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
  });

  it("requires an assignee to assign and a note to reject", () => {
    const admin = base({ role: "admin", userId: "u-admin" });
    expect(checkTransition(admin, "assigned")).toEqual({ ok: false, reason: "assignee_required" });
    expect(checkTransition({ ...admin, assigneeId: "u-officer" }, "assigned").ok).toBe(true);
    expect(checkTransition(admin, "rejected", "  ")).toEqual({ ok: false, reason: "note_required" });
    expect(checkTransition(admin, "rejected", "Duplicate of ZG-26-000001").ok).toBe(true);
  });

  it("only the assigned officer (or an admin) can start and resolve work", () => {
    const assigned = base({ status: "assigned", assigneeId: "u-officer" });
    expect(checkTransition({ ...assigned, userId: "u-officer", role: "officer" }, "in_progress").ok).toBe(true);
    expect(checkTransition({ ...assigned, userId: "u-other", role: "officer" }, "in_progress")).toEqual({
      ok: false,
      reason: "forbidden",
    });
    const working = {
      ...assigned,
      status: "in_progress" as RequestStatus,
      userId: "u-officer",
      role: "officer" as const,
    };
    expect(checkTransition(working, "resolved")).toEqual({ ok: false, reason: "note_required" });
    expect(checkTransition(working, "resolved", "Replaced the washer").ok).toBe(true);
  });

  it("lets the requester confirm or reopen a resolved request, and the system auto-close it", () => {
    const resolved = base({ status: "resolved", assigneeId: "u-officer" });
    expect(checkTransition(resolved, "closed").ok).toBe(true);
    expect(checkTransition(resolved, "reopened", "Still leaking").ok).toBe(true);
    expect(checkTransition({ ...resolved, userId: null, role: "system" }, "closed").ok).toBe(true);
    expect(checkTransition({ ...resolved, userId: null, role: "system" }, "reopened", "x").ok).toBe(false);
  });

  it("lists only the actions a user can take", () => {
    const officerView = availableTransitions(
      base({ status: "in_progress", userId: "u-officer", role: "officer", assigneeId: "u-officer" }),
    ).map((t) => t.to);
    expect(officerView).toEqual(["on_hold", "resolved"]);
    expect(availableTransitions(base({ status: "in_progress" }))).toEqual([]);
  });
});
