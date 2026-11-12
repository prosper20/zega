import { z } from "@hono/zod-openapi";

export const ProblemSchema = z
  .object({
    type: z.string().openapi({ example: "https://zega.app/problems/validation-failed" }),
    title: z.string().openapi({ example: "Validation failed" }),
    status: z.number().int().openapi({ example: 422 }),
    detail: z.string().optional().openapi({ example: "Request validation failed." }),
    instance: z.string().optional().openapi({ example: "/api/requests" }),
    requestId: z.string().optional().openapi({ example: "req_7f3c2a91" }),
    errors: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional()
      .openapi({ example: [{ path: "title", message: "Too small: expected string to have >=5 characters" }] }),
  })
  .openapi("Problem", { description: "RFC 9457 Problem Details" });

const problem = (description: string) => ({
  description,
  content: { "application/problem+json": { schema: ProblemSchema } },
});

export const errorResponses = {
  401: problem("Not signed in"),
  403: problem("Signed in but not allowed"),
  404: problem("Not found"),
  422: problem("Validation failed"),
} as const;

export const json = <T extends z.ZodTypeAny>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

export const jsonBody = <T extends z.ZodTypeAny>(schema: T) => ({
  required: true,
  content: { "application/json": { schema } },
});

export const IdParam = z.object({
  id: z
    .string()
    .min(1)
    .openapi({
      param: { name: "id", in: "path" },
      description: "UUID or reference code (e.g. ZG-26-000123)",
      example: "ZG-26-000123",
    }),
});

export const UuidParam = z.object({
  id: z.uuid().openapi({ param: { name: "id", in: "path" }, example: "7c1f5a2e-2f4b-4d0e-9a8a-1b2c3d4e5f60" }),
});

export const UserIdParam = z.object({
  id: z
    .string()
    .min(1)
    .openapi({ param: { name: "id", in: "path" }, example: "usr_000001" }),
});

export const PageInfoSchema = z
  .object({
    nextCursor: z.string().nullable().openapi({ description: "Pass as `cursor` to get the next page" }),
    total: z.number().int(),
    limit: z.number().int(),
  })
  .openapi("PageInfo");

export const CursorQuery = {
  cursor: z.string().optional().openapi({ description: "Opaque cursor from `pageInfo.nextCursor`" }),
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
};

export const OkSchema = z.object({ ok: z.literal(true) }).openapi("Ok");
