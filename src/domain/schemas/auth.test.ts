import { describe, expect, it } from "vitest";

import { passwordStrength, profileFieldsSchema, registerSchema } from "./auth";

const valid = {
  name: "Tobi Adewale",
  email: "Tobi@Example.com ",
  password: "Passw0rd!",
  confirmPassword: "Passw0rd!",
  accountType: "student",
  matricOrStaffNo: "zu/2023/01027",
  department: "Computer Science",
  phone: "",
};

describe("registration schema", () => {
  it("normalises email and matric number", () => {
    const out = registerSchema.parse(valid);
    expect(out.email).toBe("tobi@example.com");
    expect(out.matricOrStaffNo).toBe("ZU/2023/01027");
  });

  it("checks the ID format against the account type", () => {
    expect(registerSchema.safeParse({ ...valid, accountType: "staff" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, accountType: "staff", matricOrStaffNo: "STF/0412" }).success).toBe(
      true,
    );
  });

  it("only allows student or staff self-registration", () => {
    const r = profileFieldsSchema.safeParse({
      accountType: "admin",
      matricOrStaffNo: "ZU/2023/01027",
      department: "Law",
    });
    expect(r.success).toBe(false);
  });

  it("requires matching passwords with a letter and a number", () => {
    expect(registerSchema.safeParse({ ...valid, confirmPassword: "different1" }).success).toBe(false);
    expect(
      registerSchema.safeParse({ ...valid, password: "onlyletters", confirmPassword: "onlyletters" }).success,
    ).toBe(false);
  });

  it("scores password strength", () => {
    expect(passwordStrength("abc")).toBe(0);
    expect(passwordStrength("abcdefgh")).toBe(1);
    expect(passwordStrength("Abcdefgh1!xyz")).toBe(4);
  });
});
