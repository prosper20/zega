import "server-only";

import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, jwt } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { appUrl, trustedOrigins } from "@/config/app-url";
import { profileFieldsSchema } from "@/domain/schemas/auth";
import { env } from "@/env";

import { db } from "./db";
import * as s from "./db/schema";

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  appName: "ZEGA",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? appUrl(),
  trustedOrigins: trustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: s.users,
      session: s.sessions,
      account: s.accounts,
      verification: s.verifications,
      jwks: s.jwks,
      rateLimit: s.rateLimits,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      department: { type: "string", required: false },
      phone: { type: "string", required: false },
      matricOrStaffNo: { type: "string", required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 120,
    // Strict in production; relaxed locally so automated tests (all from one IP) are not throttled.
    customRules: {
      "/sign-in/email": { window: 60, max: isProd ? 10 : 200 },
      "/sign-up/email": { window: 60, max: isProd ? 5 : 100 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  databaseHooks: {
    user: {
      create: {
        /** Self-registration is for students and staff only; validates and normalises profile fields. */
        before: async (user, ctx) => {
          // Users created by an admin (admin plugin) already carry an explicit role.
          if (ctx?.path !== "/sign-up/email") return { data: user };
          const body = (ctx.body ?? {}) as Record<string, unknown>;
          const parsed = profileFieldsSchema.safeParse({
            accountType: body.accountType,
            matricOrStaffNo: body.matricOrStaffNo ?? "",
            department: body.department ?? "",
            phone: body.phone ?? "",
          });
          if (!parsed.success) {
            throw new APIError("BAD_REQUEST", {
              message: parsed.error.issues[0]?.message ?? "Invalid profile details.",
            });
          }
          const taken = await db
            .select({ id: s.users.id })
            .from(s.users)
            .where(eq(s.users.matricOrStaffNo, parsed.data.matricOrStaffNo))
            .limit(1);
          if (taken.length) {
            throw new APIError("BAD_REQUEST", { message: "That matric or staff number is already registered." });
          }
          return {
            data: {
              ...user,
              role: parsed.data.accountType,
              matricOrStaffNo: parsed.data.matricOrStaffNo,
              department: parsed.data.department,
              phone: parsed.data.phone || null,
            },
          };
        },
      },
    },
  },
  plugins: [
    admin({ defaultRole: "student", adminRoles: ["admin"] }),
    jwt({ jwt: { expirationTime: "15m", issuer: "zega" } }),
    nextCookies(), // must be last: lets server actions set auth cookies
  ],
});

export type Session = typeof auth.$Infer.Session;
