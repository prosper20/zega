import type { RoleSlug } from "./constants";

// The seed copies this into the roles tables; the API checks it in code.
export const PERMISSIONS = {
  "request:create": "Submit new service requests",
  "request:read:own": "View requests you submitted",
  "request:read:assigned": "View requests assigned to you",
  "request:read:all": "View every request",
  "request:update:own": "Edit or cancel your own open requests",
  "request:assign": "Assign and reassign requests to officers",
  "request:transition": "Change request status (subject to the lifecycle rules)",
  "request:delete": "Delete requests",
  "request:vote": "Add a “me too” vote to an existing request",
  "request:rate": "Rate the resolution of your request",
  "comment:create": "Comment on requests you can see",
  "comment:internal": "Write and read internal (staff-only) notes",
  "user:manage": "Create users, change roles and deactivate accounts",
  "catalog:manage": "Manage categories, SLA policies and locations",
  "report:view": "View dashboards and export reports",
  "audit:view": "View and verify the audit trail",
} as const;

export type Permission = keyof typeof PERMISSIONS;

const REQUESTER: Permission[] = [
  "request:create",
  "request:read:own",
  "request:update:own",
  "request:vote",
  "request:rate",
  "comment:create",
];

export const ROLE_PERMISSIONS: Readonly<Record<RoleSlug, readonly Permission[]>> = {
  student: REQUESTER,
  staff: REQUESTER,
  officer: ["request:read:assigned", "request:transition", "comment:create", "comment:internal"],
  admin: Object.keys(PERMISSIONS) as Permission[],
};

export const ROLE_INFO: Readonly<Record<RoleSlug, { label: string; description: string }>> = {
  student: { label: "Student", description: "Reports faults and tracks their own requests." },
  staff: { label: "Staff", description: "University staff who report faults and track their own requests." },
  officer: { label: "Maintenance officer", description: "Works on assigned requests and updates their progress." },
  admin: { label: "Administrator", description: "Manages users, assigns work, monitors status and reports." },
};

export function can(role: RoleSlug, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}
