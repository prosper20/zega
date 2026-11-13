import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { categories } from "@/test/fixtures";
import { server, setupMswServer } from "@/test/msw";
import { renderWithProviders } from "@/test/render";

import { UsersManager } from "./users-manager";

setupMswServer();
const officer = {
  id: "u-off",
  name: "Chinedu Okeke",
  email: "officer@zega.test",
  role: "officer",
  department: "Works",
  matricOrStaffNo: null,
  banned: false,
  createdAt: "2026-01-01T00:00:00Z",
  specialties: ["plumbing"],
};
const me = {
  ...officer,
  id: "u-admin",
  name: "Adaeze Okafor",
  email: "admin@zega.test",
  role: "admin",
  specialties: [],
};
let calls: { method: string; path: string; body: unknown }[];

beforeEach(() => {
  calls = [];
  const record = async ({ request }: { request: Request }) => {
    calls.push({ method: request.method, path: new URL(request.url).pathname, body: await request.json() });
    return HttpResponse.json(officer);
  };
  server.use(
    http.get("*/api/users", () => HttpResponse.json({ data: [me, officer], total: 2 })),
    http.get("*/api/categories", () => HttpResponse.json(categories)),
    http.post("*/api/users", record),
    http.patch("*/api/users/:id", record),
    http.put("*/api/users/:id/specialties", record),
  );
});

describe("UsersManager", () => {
  it("lists users with roles and officer specialties, and protects the current admin", async () => {
    renderWithProviders(<UsersManager currentUserId="u-admin" />);
    await screen.findAllByText("Chinedu Okeke");
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Chinedu Okeke", { selector: "div" })).toBeInTheDocument();
    expect(table.getByText("Plumbing")).toBeInTheDocument();
    expect(table.queryByRole("button", { name: "Actions for Adaeze Okafor" })).not.toBeInTheDocument();
  });

  it("deactivates a user", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersManager currentUserId="u-admin" />);
    await screen.findAllByText("Chinedu Okeke");
    const table = within(screen.getByRole("table"));
    await user.click(table.getByRole("button", { name: "Actions for Chinedu Okeke" }));
    await user.click(screen.getByRole("menuitem", { name: /Deactivate/ }));
    await waitFor(() => expect(calls).toEqual([{ method: "PATCH", path: "/api/users/u-off", body: { banned: true } }]));
  });

  it("adds an officer with a generated temporary password", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersManager currentUserId="u-admin" />);
    await user.click(await screen.findByRole("button", { name: /Add user/ }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Full name"), "Kunle Ade");
    await user.type(within(dialog).getByLabelText("Email"), "kunle@zega.test");
    await user.click(within(dialog).getByRole("button", { name: "Generate" }));
    await user.click(within(dialog).getByRole("button", { name: "Add user" }));
    await waitFor(() =>
      expect(calls[0]).toMatchObject({
        method: "POST",
        path: "/api/users",
        body: { name: "Kunle Ade", email: "kunle@zega.test", role: "officer" },
      }),
    );
    expect((calls[0].body as { password: string }).password).toMatch(/^Zg-\d{8}a$/);
  });
});
