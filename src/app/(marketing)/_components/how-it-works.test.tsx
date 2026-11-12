import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { HowItWorks } from "./how-it-works";

describe("HowItWorks", () => {
  it("starts on the first step and switches when another step is clicked", async () => {
    render(<HowItWorks />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    await userEvent.click(screen.getByRole("tab", { name: /resolve it/i }));
    expect(screen.getByRole("tab", { name: /resolve it/i })).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
  });
});
