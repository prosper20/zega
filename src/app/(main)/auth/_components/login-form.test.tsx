import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { routerMock } from "@/test/router";

const signInEmail = vi.fn();
vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { email: (...a: unknown[]) => signInEmail(...a) } } }));

import { LoginForm } from "./login-form";

beforeEach(() => {
  signInEmail.mockReset();
  routerMock.replace.mockReset();
});

describe("LoginForm", () => {
  it("signs in with a one-click demo account and returns to the requested page", async () => {
    signInEmail.mockResolvedValue({ data: { user: { name: "Adaeze Okafor" } }, error: null });
    render(<LoginForm next="/dashboard/admin/audit" />);
    await userEvent.click(screen.getByRole("button", { name: "Admin" }));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/dashboard/admin/audit"));
    expect(signInEmail).toHaveBeenCalledWith({ email: "admin@zega.test", password: "Zega@2026!", rememberMe: false });
  });

  it("shows an error for a wrong password and stays on the page", async () => {
    signInEmail.mockResolvedValue({ data: null, error: { status: 401, message: "Invalid" } });
    render(<LoginForm next="/dashboard" />);
    await userEvent.type(screen.getByLabelText("Email address"), "student@zega.test");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Incorrect email or password.")).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("explains rate limiting inline", async () => {
    signInEmail.mockResolvedValue({ data: null, error: { status: 429, message: "Too many" } });
    render(<LoginForm next="/dashboard" />);
    await userEvent.click(screen.getByRole("button", { name: "Student" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Too many attempts/);
  });

  it("validates the email before calling the server", async () => {
    render(<LoginForm next="/dashboard" />);
    await userEvent.type(screen.getByLabelText("Email address"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
  });
});
