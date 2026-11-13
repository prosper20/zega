import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server, setupMswServer } from "@/test/msw";
import { renderWithProviders } from "@/test/render";

import { AuditLog } from "./audit-log";

setupMswServer();
const entry = {
  id: 42,
  tableName: "service_requests",
  rowId: "11111111-1111-4111-8111-111111111111",
  action: "UPDATE",
  actorId: "u1",
  actorName: "Chinedu Okeke",
  diff: { changes: { status: { old: "assigned", new: "in_progress" }, updated_at: { old: 1, new: 2 } } },
  hash: "a".repeat(64),
  prevHash: "b".repeat(64),
  createdAt: "2026-11-12T08:00:00Z",
};

describe("AuditLog", () => {
  it("shows who changed what, with a readable diff", async () => {
    server.use(http.get("*/api/audit", () => HttpResponse.json({ data: [entry], nextBefore: null })));
    renderWithProviders(<AuditLog />);
    expect(await screen.findByText("Chinedu Okeke")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Chinedu Okeke"));
    expect(screen.getByText("assigned")).toHaveClass("line-through");
    expect(screen.getByText("in_progress")).toBeInTheDocument();
    expect(screen.queryByText("updated_at")).not.toBeInTheDocument();
  });

  it("reports tampering found by the integrity check", async () => {
    server.use(
      http.get("*/api/audit", () => HttpResponse.json({ data: [entry], nextBefore: null })),
      http.get("*/api/audit/verify", () =>
        HttpResponse.json({
          intact: false,
          checked: 120,
          firstBrokenId: 77,
          durationMs: 12,
          verifiedAt: "2026-11-12T08:00:00Z",
        }),
      ),
    );
    renderWithProviders(<AuditLog />);
    await userEvent.click(await screen.findByRole("button", { name: /Verify integrity/ }));
    expect(await screen.findByText("Tampering detected at entry #77")).toBeInTheDocument();
  });
});
