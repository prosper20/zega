import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TimelineItem } from "@/lib/queries";

import { Timeline } from "./timeline";

const items: TimelineItem[] = [
  {
    kind: "status",
    at: "2026-11-10T08:00:00Z",
    actor: { id: "u1", name: "Tobi Adewale" },
    from: null,
    to: "submitted",
    note: null,
  },
  {
    kind: "assignment",
    at: "2026-11-10T09:00:00Z",
    actor: { id: "a1", name: "Adaeze Okafor" },
    officer: { id: "o1", name: "Chinedu Okeke" },
    note: "Urgent please",
  },
  {
    kind: "comment",
    at: "2026-11-10T10:00:00Z",
    actor: { id: "o1", name: "Chinedu Okeke" },
    body: "Parts ordered",
    internal: true,
  },
  {
    kind: "status",
    at: "2026-11-14T10:00:00Z",
    actor: null,
    from: "resolved",
    to: "closed",
    note: "Closed automatically",
  },
];

describe("Timeline", () => {
  it("describes each kind of event, marks internal notes and attributes system actions", () => {
    render(<Timeline items={items} />);
    expect(screen.getByText(/reported this request/)).toBeInTheDocument();
    expect(screen.getAllByText("Chinedu Okeke")).toHaveLength(2); // assigned officer and comment author
    expect(screen.getByText("Urgent please")).toBeInTheDocument();
    expect(screen.getByText("Internal note")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    render(<Timeline items={[]} />);
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });
});
