import { z } from "zod";

/** Shared by the register form (client) and the Better Auth sign-up hook (server). */

export const ACCOUNT_TYPES = ["student", "staff"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const MATRIC_PATTERN = /^ZU\/\d{4}\/\d{5}$/i;
export const STAFF_ID_PATTERN = /^STF\/\d{4}$/i;

export const ID_FORMAT_HINT: Record<AccountType, string> = {
  student: "Matric number, e.g. ZU/2023/01027",
  staff: "Staff ID, e.g. STF/0412",
};

export const DEPARTMENT_OPTIONS = [
  "Accounting",
  "Business Administration",
  "Computer Science",
  "Economics",
  "Law",
  "Mass Communication",
  "Microbiology",
  "Nursing",
  "Public Health",
  "Software Engineering",
  "Works & Services",
  "Other",
] as const;

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use at most 128 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export const profileFieldsSchema = z
  .object({
    accountType: z.enum(ACCOUNT_TYPES),
    matricOrStaffNo: z.string().trim().toUpperCase(),
    department: z.string().trim().min(2, "Choose your department."),
    phone: z
      .string()
      .trim()
      .regex(/^\+?\d[\d\s-]{6,18}$/, "Enter a valid phone number.")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    const ok =
      v.accountType === "student" ? MATRIC_PATTERN.test(v.matricOrStaffNo) : STAFF_ID_PATTERN.test(v.matricOrStaffNo);
    if (!ok)
      ctx.addIssue({
        code: "custom",
        path: ["matricOrStaffNo"],
        message: `Use the format ${ID_FORMAT_HINT[v.accountType].split("e.g. ")[1]}.`,
      });
  });

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(80),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .and(profileFieldsSchema)
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Scores a password 0 to 4 for the strength meter. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}
