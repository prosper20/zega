import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

import { addAttachment, MAX_ATTACHMENT_BYTES } from "@/server/services/attachments";
import * as svc from "@/server/services/requests";

import type { AppEnv } from "../context";
import { authed, requireUser } from "../guard";
import { problems } from "../problem";
import { errorResponses, IdParam, json, jsonBody, OkSchema } from "../schemas/common";
import {
  AssignSchema,
  AttachmentSchema,
  CommentSchema,
  CreateCommentSchema,
  CreateRequestSchema,
  OfficerSuggestionSchema,
  RequestDetailSchema,
  RequestListQuery,
  RequestListSchema,
  SimilarQuery,
  SimilarRequestSchema,
  TimelineItemSchema,
  TransitionSchema,
  UpdateRequestSchema,
} from "../schemas/requests";

const tags = ["Requests"];
const VoteResult = z.object({ voteCount: z.number().int(), hasVoted: z.boolean() }).openapi("VoteResult");

export function requestRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/requests",
      tags,
      summary: "List requests",
      description:
        "Requests visible to the caller (own requests for students and staff, assigned jobs for officers, everything for admins), with full-text search, filters and keyset pagination.",
      security: authed,
      request: { query: RequestListQuery },
      responses: { 200: json(RequestListSchema, "A page of requests"), ...errorResponses },
    }),
    async (c) => c.json(await svc.listRequests(c.get("db"), requireUser(c), c.req.valid("query")), 200),
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/requests",
      tags,
      summary: "Report an issue",
      description:
        "Creates a request, computes SLA due dates from the category and priority, and notifies administrators.",
      security: authed,
      request: { body: jsonBody(CreateRequestSchema) },
      responses: { 201: json(RequestDetailSchema, "The created request"), ...errorResponses },
    }),
    async (c) => c.json(await svc.createRequest(c.get("db"), requireUser(c), c.req.valid("json")), 201),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/requests/similar",
      tags,
      summary: "Find similar open requests",
      description:
        "Duplicate detection while reporting: open requests in the same building with a similar title (trigram similarity).",
      security: authed,
      request: { query: SimilarQuery },
      responses: { 200: json(z.array(SimilarRequestSchema), "Up to five similar open requests"), ...errorResponses },
    }),
    async (c) => c.json(await svc.findSimilar(c.get("db"), requireUser(c), c.req.valid("query")), 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/requests/{id}",
      tags,
      summary: "Get a request",
      description: "Accepts the UUID or the reference code. Includes the actions the caller can take next.",
      security: authed,
      request: { params: IdParam },
      responses: { 200: json(RequestDetailSchema, "The request"), ...errorResponses },
    }),
    async (c) => c.json(await svc.getRequest(c.get("db"), requireUser(c), c.req.valid("param").id), 200),
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/requests/{id}",
      tags,
      summary: "Update a request",
      description:
        "Requesters may edit their own request before work starts; admins may also change category and priority.",
      security: authed,
      request: { params: IdParam, body: jsonBody(UpdateRequestSchema) },
      responses: { 200: json(RequestDetailSchema, "The updated request"), ...errorResponses },
    }),
    async (c) =>
      c.json(await svc.updateRequest(c.get("db"), requireUser(c), c.req.valid("param").id, c.req.valid("json")), 200),
  );

  app.openapi(
    createRoute({
      method: "delete",
      path: "/requests/{id}",
      tags,
      summary: "Delete a request (admin)",
      description: "Soft delete; the row and its history stay in the audit trail.",
      security: authed,
      request: { params: IdParam },
      responses: { 200: json(OkSchema, "Deleted"), ...errorResponses },
    }),
    async (c) => {
      await svc.deleteRequest(c.get("db"), requireUser(c), c.req.valid("param").id);
      return c.json({ ok: true as const }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/requests/{id}/transitions",
      tags,
      summary: "Change status",
      description:
        "Moves the request through its lifecycle. The state machine decides what is allowed for the caller; invalid moves return 409, missing notes 422.",
      security: authed,
      request: { params: IdParam, body: jsonBody(TransitionSchema) },
      responses: { 200: json(RequestDetailSchema, "The updated request"), 409: errorResponses[422], ...errorResponses },
    }),
    async (c) =>
      c.json(
        await svc.transitionRequest(c.get("db"), requireUser(c), c.req.valid("param").id, c.req.valid("json")),
        200,
      ),
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/requests/{id}/assignments",
      tags,
      summary: "Assign or reassign an officer (admin)",
      security: authed,
      request: { params: IdParam, body: jsonBody(AssignSchema) },
      responses: { 200: json(RequestDetailSchema, "The updated request"), 409: errorResponses[422], ...errorResponses },
    }),
    async (c) =>
      c.json(await svc.assignRequest(c.get("db"), requireUser(c), c.req.valid("param").id, c.req.valid("json")), 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/requests/{id}/suggestions",
      tags,
      summary: "Suggested officers (admin)",
      description: "Officers ranked by category specialty and current open workload.",
      security: authed,
      request: { params: IdParam },
      responses: { 200: json(z.array(OfficerSuggestionSchema), "Ranked officers"), ...errorResponses },
    }),
    async (c) => c.json(await svc.suggestOfficers(c.get("db"), requireUser(c), c.req.valid("param").id), 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/requests/{id}/timeline",
      tags,
      summary: "Request timeline",
      description:
        "Status changes, assignments, comments and attachments in order. Internal notes only for officers and admins.",
      security: authed,
      request: { params: IdParam },
      responses: { 200: json(z.array(TimelineItemSchema), "Timeline items, oldest first"), ...errorResponses },
    }),
    async (c) => c.json((await svc.getTimeline(c.get("db"), requireUser(c), c.req.valid("param").id)) as never, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/requests/{id}/comments",
      tags,
      summary: "List comments",
      security: authed,
      request: { params: IdParam },
      responses: { 200: json(z.array(CommentSchema), "Comments, oldest first"), ...errorResponses },
    }),
    async (c) => c.json(await svc.listComments(c.get("db"), requireUser(c), c.req.valid("param").id), 200),
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/requests/{id}/comments",
      tags,
      summary: "Add a comment or internal note",
      security: authed,
      request: { params: IdParam, body: jsonBody(CreateCommentSchema) },
      responses: { 201: json(CommentSchema, "The new comment"), ...errorResponses },
    }),
    async (c) =>
      c.json(await svc.addComment(c.get("db"), requireUser(c), c.req.valid("param").id, c.req.valid("json")), 201),
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/requests/{id}/attachments",
      tags,
      summary: "Upload a photo",
      description:
        "multipart/form-data with `file` (JPEG, PNG or WebP, max 3 MB, checked by content not extension) and `kind` (`evidence` for requesters, `before`/`after` for the assigned officer). Browsers compress and strip location metadata before upload.",
      security: authed,
      request: {
        params: IdParam,
        body: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: z.object({
                file: z.any().openapi({ type: "string", format: "binary" }),
                kind: z.enum(["evidence", "before", "after"]).default("evidence"),
              }),
            },
          },
        },
      },
      responses: { 201: json(AttachmentSchema, "The stored attachment"), 409: errorResponses[422], ...errorResponses },
    }),
    async (c) => {
      const user = requireUser(c);
      const db = c.get("db");
      const row = await svc.loadVisible(db, user, c.req.valid("param").id);
      const form = await c.req.parseBody();
      const file = form.file;
      if (!(file instanceof File))
        throw problems.invalid("Attach an image in the `file` field.", [{ path: "file", message: "Required." }]);
      if (file.size > MAX_ATTACHMENT_BYTES) throw problems.invalid("Photos must be 3 MB or smaller.");
      const kind = form.kind === "before" || form.kind === "after" ? form.kind : "evidence";
      const bytes = new Uint8Array(await file.arrayBuffer());
      return c.json(await addAttachment(db, c.get("storage"), user, row, { bytes, kind }), 201);
    },
  );

  for (const [method, on] of [
    ["put", true],
    ["delete", false],
  ] as const) {
    app.openapi(
      createRoute({
        method,
        path: "/requests/{id}/vote",
        tags,
        summary: on ? "Add a “me too” vote" : "Remove your “me too” vote",
        security: authed,
        request: { params: IdParam },
        responses: { 200: json(VoteResult, "Vote state"), 409: errorResponses[422], ...errorResponses },
      }),
      async (c) => c.json(await svc.setVote(c.get("db"), requireUser(c), c.req.valid("param").id, on), 200),
    );
  }
}
