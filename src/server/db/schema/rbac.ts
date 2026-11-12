import { boolean, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/** Roles: student, staff, officer, admin. `slug` is referenced by users.role. */
export const roles = pgTable("roles", {
  slug: text().primaryKey(),
  label: text().notNull(),
  description: text().notNull(),
  isSystem: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Fine-grained permissions such as `request:assign`. */
export const permissions = pgTable("permissions", {
  key: text().primaryKey(),
  description: text().notNull(),
});

/** Many-to-many: which permissions each role grants. */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleSlug: text()
      .notNull()
      .references(() => roles.slug, { onDelete: "cascade", onUpdate: "cascade" }),
    permissionKey: text()
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleSlug, t.permissionKey] })],
);
