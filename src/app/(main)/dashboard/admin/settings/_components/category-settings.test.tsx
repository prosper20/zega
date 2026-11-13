import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server, setupMswServer } from "@/test/msw";
import { renderWithProviders } from "@/test/render";

import { CategorySettings } from "./category-settings";

setupMswServer();

describe("CategorySettings", () => {
  it("edits SLA targets in hours and saves them in minutes", async () => {
    let saved: unknown;
    server.use(
      http.get("*/api/categories", () =>
        HttpResponse.json([
          {
            id: "c1",
            slug: "plumbing",
            name: "Plumbing",
            description: "Leaks",
            icon: "droplets",
            defaultPriority: "high",
            archived: false,
            sla: [
              { priority: "low", responseMinutes: 1440, resolutionMinutes: 10080 },
              { priority: "medium", responseMinutes: 240, resolutionMinutes: 4320 },
              { priority: "high", responseMinutes: 60, resolutionMinutes: 1440 },
              { priority: "urgent", responseMinutes: 30, resolutionMinutes: 240 },
            ],
          },
        ]),
      ),
      http.put("*/api/categories/c1/sla", async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json({});
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<CategorySettings />);
    const urgentResolution = await screen.findByLabelText("urgent resolution target in hours");
    expect(urgentResolution).toHaveValue(4);
    const save = screen.getByRole("button", { name: /Save targets/ });
    expect(save).toBeDisabled();
    await user.clear(urgentResolution);
    await user.type(urgentResolution, "2.5");
    await user.click(save);
    await waitFor(() =>
      expect(
        (saved as { policies: { priority: string; resolutionMinutes: number }[] }).policies.find(
          (p) => p.priority === "urgent",
        ),
      ).toEqual({
        priority: "urgent",
        responseMinutes: 30,
        resolutionMinutes: 150,
      }),
    );
  });
});
