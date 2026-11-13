import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { requestDetail } from "@/test/fixtures";
import { server, setupMswServer } from "@/test/msw";
import { renderWithProviders } from "@/test/render";

import { ActionsPanel } from "./actions-panel";

setupMswServer();

describe("ActionsPanel", () => {
  it("offers exactly the transitions the API allows and asks the requester to confirm", () => {
    renderWithProviders(<ActionsPanel request={requestDetail()} />);
    expect(screen.getByText("Is it fixed?")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Confirm fix", "Reopen"]);
  });

  it("requires a note to reopen", async () => {
    renderWithProviders(<ActionsPanel request={requestDetail()} />);
    await userEvent.click(screen.getByRole("button", { name: "Reopen" }));
    const submit = screen.getAllByRole("button", { name: "Reopen" }).at(-1) as HTMLElement;
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/What is still wrong/), "Still dripping");
    expect(submit).toBeEnabled();
  });

  it("confirms the fix with a star rating", async () => {
    let body: unknown;
    server.use(
      http.post("*/api/requests/:id/transitions", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(requestDetail({ status: "closed", availableTransitions: [] }));
      }),
    );
    renderWithProviders(<ActionsPanel request={requestDetail()} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirm fix" }));
    await userEvent.click(screen.getByRole("button", { name: "4 stars" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Confirm fix" }).at(-1) as HTMLElement);
    await waitFor(() => expect(body).toEqual({ to: "closed", rating: { score: 4 } }));
  });

  it("renders nothing when no action is available", () => {
    const { container } = renderWithProviders(
      <ActionsPanel request={requestDetail({ status: "closed", availableTransitions: [] })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
