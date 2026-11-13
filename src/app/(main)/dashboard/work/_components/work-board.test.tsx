import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { requestDetail } from "@/test/fixtures";
import { server, setupMswServer } from "@/test/msw";
import { renderWithProviders } from "@/test/render";

import { WorkBoard } from "./work-board";

setupMswServer();
const OFFICER = "u-officer";

const job = (id: string, status: "assigned" | "in_progress" | "on_hold" | "resolved", title: string) => {
  const {
    description,
    locationDetail,
    firstResponseAt,
    hasVoted,
    rating,
    attachments,
    availableTransitions,
    can,
    ...summary
  } = requestDetail({
    id,
    refCode: `ZG-26-00010${id}`,
    status,
    title,
    assignee: { id: OFFICER, name: "Chinedu Okeke", role: "officer" },
  });
  return summary;
};

let transitions: { id: string; body: unknown }[];
beforeEach(() => {
  transitions = [];
  server.use(
    http.get("*/api/requests", () =>
      HttpResponse.json({
        data: [job("1", "assigned", "Broken socket"), job("2", "in_progress", "Leaking tap")],
        pageInfo: { nextCursor: null, total: 2, limit: 100 },
      }),
    ),
    http.post("*/api/requests/:id/transitions", async ({ params, request }) => {
      transitions.push({ id: String(params.id), body: await request.json() });
      return HttpResponse.json({});
    }),
  );
});

describe("WorkBoard", () => {
  it("puts jobs in their status columns", async () => {
    renderWithProviders(<WorkBoard officerId={OFFICER} />);
    const assigned = await screen.findByRole("region", { name: /^Assigned \(1\)/ });
    expect(within(assigned).getByText("Broken socket")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: /^In progress \(1\)/ })).getByText("Leaking tap"),
    ).toBeInTheDocument();
  });

  it("only offers moves the lifecycle allows, and asks for a note where required", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkBoard officerId={OFFICER} />);
    await user.click(await screen.findByRole("button", { name: "Move ZG-26-000101" }));
    expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["In progress", "On hold"]);

    await user.click(screen.getByRole("menuitem", { name: "On hold" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    const confirm = within(screen.getByRole("dialog")).getByRole("button", { name: "Put on hold" });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("What is it waiting for?"), "Waiting for a new socket from stores");
    await user.click(confirm);
    await waitFor(() =>
      expect(transitions).toEqual([{ id: "1", body: { to: "on_hold", note: "Waiting for a new socket from stores" } }]),
    );
  });

  it("moves straight away when no note is needed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkBoard officerId={OFFICER} />);
    await user.click(await screen.findByRole("button", { name: "Move ZG-26-000101" }));
    await user.click(screen.getByRole("menuitem", { name: "In progress" }));
    await waitFor(() => expect(transitions).toEqual([{ id: "1", body: { to: "in_progress" } }]));
  });
});
