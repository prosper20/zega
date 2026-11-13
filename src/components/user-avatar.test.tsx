import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ROLE_SLUGS } from "@/domain/constants";

import { AVATAR_PALETTES, avatarComposition, UserAvatar } from "./user-avatar";

describe("UserAvatar", () => {
  it("is deterministic: the same user always gets the same picture", () => {
    expect(avatarComposition("usr_123", "student")).toEqual(avatarComposition("usr_123", "student"));
    expect(avatarComposition("usr_123", "student")).not.toEqual(avatarComposition("usr_124", "student"));
  });

  it("draws only from its role's colour family, and the families do not overlap", () => {
    for (const role of ROLE_SLUGS) {
      for (let i = 0; i < 30; i++) {
        const c = avatarComposition(`usr_${i}`, role);
        for (const colour of [c.background, ...c.shapes.map((s) => s.fill)])
          expect(AVATAR_PALETTES[role]).toContain(colour);
        expect(c.shapes.every((s) => s.fill !== c.background)).toBe(true);
      }
    }
    const all = ROLE_SLUGS.flatMap((r) => AVATAR_PALETTES[r]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("is labelled for assistive technology", () => {
    render(<UserAvatar id="usr_1" userRole="officer" name="Chinedu Okeke" />);
    expect(screen.getByRole("img", { name: "Chinedu Okeke" })).toBeInTheDocument();
  });
});
