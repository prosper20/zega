import { describe, expect, it } from "vitest";

import { computeDueDates, formatDuration, resolutionSlaState, responseSlaState } from "./sla";

const created = new Date("2026-11-01T08:00:00Z");
const policy = { responseMinutes: 60, resolutionMinutes: 24 * 60 };
const { responseDueAt, resolutionDueAt } = computeDueDates(created, policy);

describe("SLA engine", () => {
  it("computes due dates from the policy", () => {
    expect(responseDueAt.toISOString()).toBe("2026-11-01T09:00:00.000Z");
    expect(resolutionDueAt.toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });

  it("classifies open requests as on track, at risk or breached", () => {
    const r = { createdAt: created, resolutionDueAt, resolvedAt: null, status: "in_progress" as const };
    expect(resolutionSlaState(r, new Date("2026-11-01T12:00:00Z"))).toBe("on_track");
    expect(resolutionSlaState(r, new Date("2026-11-02T03:00:00Z"))).toBe("at_risk");
    expect(resolutionSlaState(r, new Date("2026-11-02T09:00:00Z"))).toBe("breached");
  });

  it("judges resolved requests by when they were resolved", () => {
    const base = { createdAt: created, resolutionDueAt, status: "resolved" as const };
    expect(resolutionSlaState({ ...base, resolvedAt: new Date("2026-11-01T20:00:00Z") })).toBe("met");
    expect(resolutionSlaState({ ...base, resolvedAt: new Date("2026-11-03T20:00:00Z") })).toBe("breached");
  });

  it("tracks the response target separately", () => {
    expect(responseSlaState({ responseDueAt, firstResponseAt: new Date("2026-11-01T08:30:00Z") })).toBe("met");
    expect(responseSlaState({ responseDueAt, firstResponseAt: null }, new Date("2026-11-01T10:00:00Z"))).toBe(
      "breached",
    );
  });

  it("formats durations", () => {
    expect(formatDuration(3 * 3_600_000 + 12 * 60_000)).toBe("3h 12m");
    expect(formatDuration(26 * 3_600_000)).toBe("1d 2h");
    expect(formatDuration(-5 * 60_000)).toBe("-5m");
  });
});
