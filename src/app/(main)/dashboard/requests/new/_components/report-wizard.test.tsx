import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { categories, locations, requestDetail } from "@/test/fixtures";
import { server, setupMswServer } from "@/test/msw";
import { renderWithProviders } from "@/test/render";

import { ReportWizard } from "./report-wizard";

setupMswServer();
let posted: Record<string, unknown> | null;

beforeEach(() => {
  posted = null;
  localStorage.clear();
  server.use(
    http.get("*/api/categories", () => HttpResponse.json(categories)),
    http.get("*/api/locations", () => HttpResponse.json(locations)),
    http.get("*/api/requests/similar", () =>
      HttpResponse.json([
        {
          id: "r-dup",
          refCode: "ZG-26-000099",
          title: "Leaking shower pipe",
          status: "assigned",
          location: "Moremi Hall › Shower block",
          voteCount: 2,
          hasVoted: false,
          mine: false,
          similarity: 0.6,
          createdAt: "2026-11-10T08:00:00Z",
        },
      ]),
    ),
    http.post("*/api/requests", async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(requestDetail({ status: "submitted", title: String(posted.title) }), { status: 201 });
    }),
  );
});

describe("ReportWizard", () => {
  it("guides the reporter through category, place and details, validating each step", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportWizard initialLocationId={null} lockedFromQr={false} />);

    await user.click(await screen.findByRole("button", { name: /Plumbing/ }));
    expect(await screen.findByRole("heading", { name: "Where is it?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Choose where the problem is.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search locations"), "shower");
    await user.click(screen.getByRole("option", { name: /Shower block/ }));
    await user.click(screen.getByRole("button", { name: /Continue/ }));

    expect(await screen.findByRole("heading", { name: "Describe the problem" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText(/Give it a short title/)).toBeInTheDocument();
    expect(screen.getByText(/Describe the problem \(at least 10/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Title"), "Leaking pipe in shower");
    // Similar open requests at the same place are offered as a "me too".
    expect(await screen.findByText(/Is this already reported\?/)).toBeInTheDocument();
    expect(screen.getByText("ZG-26-000099")).toBeInTheDocument();

    await user.type(screen.getByLabelText("What is happening?"), "Water is pooling across the floor.");
    await user.click(screen.getByRole("button", { name: /^urgent/i }));
    await user.click(screen.getByRole("button", { name: /Continue/ }));

    const review = await screen.findByRole("region", { name: "Check and submit" });
    expect(within(review).getByText("Moremi Hall › Shower block")).toBeInTheDocument();
    expect(within(review).getByText("Urgent")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Submit request/ }));
    expect(await screen.findByRole("heading", { name: "Request submitted" })).toBeInTheDocument();
    expect(screen.getByText("ZG-26-000123")).toBeInTheDocument();
    expect(posted).toEqual({
      title: "Leaking pipe in shower",
      description: "Water is pooling across the floor.",
      categoryId: "c-plumbing",
      locationId: "l-bath",
      priority: "urgent",
    });
  }, 20_000);

  it("locks the location when the reporter arrived by scanning a QR sticker", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportWizard initialLocationId="l-bath" lockedFromQr />);
    await user.click(await screen.findByRole("button", { name: /Electrical/ }));
    expect(await screen.findByText("Filled in from the QR sticker you scanned")).toBeInTheDocument();
    expect(screen.queryByLabelText("Search locations")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change" }));
    await waitFor(() => expect(screen.getByLabelText("Search locations")).toBeInTheDocument());
  });
});
