import { pgEnum } from "drizzle-orm/pg-core";

import { REQUEST_PRIORITIES, REQUEST_STATUSES } from "@/domain/constants";

export const requestStatus = pgEnum("request_status", REQUEST_STATUSES);
export const requestPriority = pgEnum("request_priority", REQUEST_PRIORITIES);
export const attachmentKind = pgEnum("attachment_kind", ["evidence", "before", "after"]);
export const locationKind = pgEnum("location_kind", ["campus", "building", "hostel", "floor", "room", "outdoor"]);
export const auditAction = pgEnum("audit_action", ["INSERT", "UPDATE", "DELETE"]);
