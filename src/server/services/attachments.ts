import { and, asc, eq, sql } from "drizzle-orm";

import { OPEN_STATUSES } from "@/domain/constants";
import { problems } from "@/server/api/problem";
import { withActor } from "@/server/db/actor";
import * as s from "@/server/db/schema";
import type { Database, DbOrTx } from "@/server/db/types";
import type { CurrentUser } from "@/server/session-types";
import { type Storage, sniffImage } from "@/server/storage";

import { notify } from "./notify";

export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_USER = 6;
type Kind = "evidence" | "before" | "after";

export async function listAttachments(db: DbOrTx, requestId: string) {
  const rows = await db
    .select({
      id: s.attachments.id,
      url: s.attachments.url,
      kind: s.attachments.kind,
      contentType: s.attachments.contentType,
      sizeBytes: s.attachments.sizeBytes,
      createdAt: s.attachments.createdAt,
      uploaderId: s.users.id,
      uploaderName: s.users.name,
    })
    .from(s.attachments)
    .innerJoin(s.users, eq(s.users.id, s.attachments.uploadedById))
    .where(eq(s.attachments.requestId, requestId))
    .orderBy(asc(s.attachments.createdAt));
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    kind: r.kind,
    contentType: r.contentType,
    sizeBytes: r.sizeBytes,
    createdAt: r.createdAt.toISOString(),
    uploadedBy: { id: r.uploaderId, name: r.uploaderName },
  }));
}

/**
 * Stores a photo for a request. Requesters add evidence while the request is open; the assigned
 * officer adds before/after photos while working; admins may add any kind.
 */
export async function addAttachment(
  db: Database,
  storage: Storage,
  user: CurrentUser,
  request: { id: string; refCode: string; status: string; requesterId: string; currentAssigneeId: string | null },
  file: { bytes: Uint8Array; kind: Kind },
) {
  const isOwner = request.requesterId === user.id;
  const isAssignee = user.role === "officer" && request.currentAssigneeId === user.id;
  const open = (OPEN_STATUSES as readonly string[]).includes(request.status);
  const allowed =
    user.role === "admin" ||
    (isOwner && file.kind === "evidence" && open) ||
    (isAssignee &&
      file.kind !== "evidence" &&
      ["assigned", "in_progress", "on_hold", "resolved"].includes(request.status));
  if (!allowed) throw problems.forbidden("You cannot add this kind of photo to this request right now.");

  if (file.bytes.byteLength === 0) throw problems.invalid("The file is empty.");
  if (file.bytes.byteLength > MAX_ATTACHMENT_BYTES) throw problems.invalid("Photos must be 3 MB or smaller.");
  const contentType = sniffImage(file.bytes);
  if (!contentType) throw problems.invalid("Only JPEG, PNG or WebP images are accepted.");

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.attachments)
    .where(and(eq(s.attachments.requestId, request.id), eq(s.attachments.uploadedById, user.id)));
  if (Number(n) >= MAX_ATTACHMENTS_PER_USER)
    throw problems.conflict(`You can add up to ${MAX_ATTACHMENTS_PER_USER} photos per request.`, "too-many-files");

  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const stored = await storage.put(`requests/${request.id}/${crypto.randomUUID()}.${ext}`, file.bytes, contentType);

  const [row] = await withActor(db, user.id, async (tx) => {
    const inserted = await tx
      .insert(s.attachments)
      .values({
        requestId: request.id,
        uploadedById: user.id,
        kind: file.kind,
        url: stored.url,
        pathname: stored.pathname,
        contentType,
        sizeBytes: file.bytes.byteLength,
      })
      .returning();
    if (file.kind === "after") {
      await notify(tx, {
        userIds: [request.requesterId],
        type: "request.photo",
        title: `After photo added to ${request.refCode}`,
        body: "See the completed work on your request.",
        requestId: request.id,
        exclude: user.id,
      });
    }
    return inserted;
  });
  return {
    id: row.id,
    url: row.url,
    kind: row.kind,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
    uploadedBy: { id: user.id, name: user.name },
  };
}
