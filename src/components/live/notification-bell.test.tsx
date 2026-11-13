import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server, setupMswServer } from "@/test/msw";
import { renderWithProviders } from "@/test/render";

import { NotificationBell } from "./notification-bell";

setupMswServer();

const item = (id: string, read = false) => ({
  id,
  type: "request.assigned",
  title: `Notification ${id}`,
  body: "Body",
  requestId: null,
  refCode: "ZG-26-000001",
  readAt: read ? "2026-11-10T00:00:00Z" : null,
  createdAt: "2026-11-12T08:00:00Z",
});

describe("NotificationBell", () => {
  it("shows the unread count and marks everything read", async () => {
    let unread = 2;
    let marked: unknown;
    server.use(
      http.get("*/api/notifications", () =>
        HttpResponse.json({ data: [item("1"), item("2"), item("3", true)], unread }),
      ),
      http.post("*/api/notifications/read", async ({ request }) => {
        marked = await request.json();
        unread = 0;
        return HttpResponse.json({ unread: 0 });
      }),
    );
    renderWithProviders(<NotificationBell />);
    const bell = await screen.findByRole("button", { name: "Notifications, 2 unread" });
    await userEvent.click(bell);
    expect(await screen.findByText("Notification 1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    await waitFor(() => expect(marked).toEqual({ ids: "all" }));
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });
});
