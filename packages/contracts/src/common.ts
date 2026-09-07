import { z } from "@hono/zod-openapi";

export const IdentifierSchema = z
  .uuid()
  .openapi({ example: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7531" });

export const IsoDateTimeSchema = z.iso.datetime({ offset: true }).openapi({
  example: "2026-08-31T12:00:00Z",
});

export const IsoDateSchema = z.iso.date().openapi({
  example: "2026-09-08",
});

export const CursorSchema = z.string().min(1).max(512).openapi({
  description: "Opaque pagination cursor returned by the previous response.",
});

export const CursorQuerySchema = z
  .object({
    cursor: CursorSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const CursorPageSchema = z
  .object({
    nextCursor: CursorSchema.nullable(),
    hasMore: z.boolean(),
  })
  .strict()
  .openapi("CursorPage");

export const ProblemCodeSchema = z.enum([
  "invalid_request",
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "stale_version",
  "rate_limited",
  "payload_too_large",
  "internal_error",
  "dependency_unavailable",
  "reauthentication_required",
  "sole_owner_workspace",
  "invalid_confirmation",
]);

export const ProblemDetailSchema = z
  .object({
    type: z.url(),
    title: z.string().min(1),
    status: z.number().int().min(400).max(599),
    detail: z.string().min(1).optional(),
    instance: z.string().min(1).optional(),
    traceId: z.string().min(1),
    code: ProblemCodeSchema,
    errors: z
      .array(
        z
          .object({
            field: z.string().min(1),
            message: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .openapi("ProblemDetail");

export type ProblemCode = z.infer<typeof ProblemCodeSchema>;
export type ProblemDetail = z.infer<typeof ProblemDetailSchema>;
