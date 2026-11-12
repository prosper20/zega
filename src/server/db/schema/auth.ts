import { bigint, boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { roles } from "./rbac";

/**
 * Better Auth core tables (user, session, account, verification) plus the admin plugin
 * fields (role, banned, ...), the JWT plugin's jwks table and database-backed rate limiting.
 * Property names must match Better Auth's field names; columns are snake_case via drizzle casing.
 */
export const users = pgTable(
  "users",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // admin plugin
    role: text()
      .notNull()
      .default("student")
      .references(() => roles.slug, { onUpdate: "cascade" }),
    banned: boolean().default(false),
    banReason: text(),
    banExpires: timestamp({ withTimezone: true }),
    // ZEGA profile fields
    department: text(),
    phone: text(),
    matricOrStaffNo: text().unique(),
  },
  (t) => [index("users_role_idx").on(t.role)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

export const jwks = pgTable("jwks", {
  id: text().primaryKey(),
  publicKey: text().notNull(),
  privateKey: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp({ withTimezone: true }),
  alg: text(),
  crv: text(),
});

export const rateLimits = pgTable("rate_limits", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});
