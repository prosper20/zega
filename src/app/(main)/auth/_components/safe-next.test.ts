import { describe, expect, it } from "vitest";

import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/dashboard/requests?status=open")).toBe("/dashboard/requests?status=open");
  });
  it("blocks open redirects", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "", undefined, null]) {
      expect(safeNext(bad)).toBe("/dashboard");
    }
  });
});
