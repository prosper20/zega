import { describe, expect, it } from "vitest";

import { ROLE_SLUGS } from "./constants";
import { can, PERMISSIONS, ROLE_PERMISSIONS } from "./permissions";

describe("permissions", () => {
  it("gives admins every permission", () => {
    expect([...ROLE_PERMISSIONS.admin].sort()).toEqual(Object.keys(PERMISSIONS).sort());
  });

  it("keeps requesters away from management actions", () => {
    for (const role of ["student", "staff"] as const) {
      expect(can(role, "request:create")).toBe(true);
      expect(can(role, "request:assign")).toBe(false);
      expect(can(role, "user:manage")).toBe(false);
      expect(can(role, "comment:internal")).toBe(false);
    }
  });

  it("lets officers work assigned requests but not see everything", () => {
    expect(can("officer", "request:read:assigned")).toBe(true);
    expect(can("officer", "request:read:all")).toBe(false);
    expect(can("officer", "request:create")).toBe(false);
  });

  it("only references known permissions", () => {
    for (const role of ROLE_SLUGS) for (const p of ROLE_PERMISSIONS[role]) expect(PERMISSIONS).toHaveProperty(p);
  });
});
