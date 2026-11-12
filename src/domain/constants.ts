/** Shared domain vocabulary used by the database enums, API schemas and UI. */

export const REQUEST_STATUSES = [
  "submitted",
  "triaged",
  "assigned",
  "in_progress",
  "on_hold",
  "resolved",
  "closed",
  "reopened",
  "rejected",
  "cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const OPEN_STATUSES: readonly RequestStatus[] = [
  "submitted",
  "triaged",
  "assigned",
  "in_progress",
  "on_hold",
  "reopened",
];
export const TERMINAL_STATUSES: readonly RequestStatus[] = ["closed", "rejected", "cancelled"];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: "Submitted",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In progress",
  on_hold: "On hold",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const REQUEST_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export const ROLE_SLUGS = ["student", "staff", "officer", "admin"] as const;
export type RoleSlug = (typeof ROLE_SLUGS)[number];
export const REQUESTER_ROLES: readonly RoleSlug[] = ["student", "staff"];
