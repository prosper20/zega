import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signUpEmail = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signUp: { email: (...a: unknown[]) => signUpEmail(...a) } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { RegisterForm } from "./register-form";

beforeEach(() => {
  signUpEmail.mockReset();
  replace.mockReset();
});

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Full name"), "Tobi Adewale");
  await user.type(screen.getByLabelText("Email address"), "tobi@example.com");
  await user.type(screen.getByLabelText("Matric number"), "ZU/2023/01027");
  await user.selectOptions(screen.getByLabelText("Department"), "Law");
  await user.type(screen.getByLabelText("Password"), "Passw0rd!");
  await user.type(screen.getByLabelText("Confirm password"), "Passw0rd!");
}

describe("RegisterForm", () => {
  it("shows validation errors and does not submit an empty form", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("switches the ID field to staff ID for staff accounts", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByLabelText("Staff"));
    expect(screen.getByLabelText("Staff ID")).toBeInTheDocument();
  });

  it("submits normalised values with the account type and redirects", async () => {
    signUpEmail.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(signUpEmail).toHaveBeenCalledOnce());
    expect(signUpEmail.mock.calls[0][0]).toMatchObject({
      email: "tobi@example.com",
      accountType: "student",
      matricOrStaffNo: "ZU/2023/01027",
      department: "Law",
    });
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("shows the server error on the right field", async () => {
    signUpEmail.mockResolvedValue({
      data: null,
      error: { message: "That matric or staff number is already registered." },
    });
    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("That matric or staff number is already registered.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
