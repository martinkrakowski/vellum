import { z } from "zod";
import { FeedbackPayloadSchema } from "./Feedback.vo.js";
import { SceneConfigSchema } from "./SceneConfig.vo.js";

export const IterationStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export type IterationStatus = z.infer<typeof IterationStatusSchema>;

/**
 * One entry in the append-only ledger that travels with every state
 * transition and becomes the AuditTrail on export.
 */
export const SceneIterationSchema = z.object({
  attempt: z.number().int().min(1),
  config: SceneConfigSchema,
  status: IterationStatusSchema,
  feedback: FeedbackPayloadSchema.nullable(),
  distortionWarning: z.boolean(),
  /** ISO-8601 timestamps. */
  startedAt: z.string(),
  resolvedAt: z.string().nullable(),
});

export type SceneIteration = z.infer<typeof SceneIterationSchema>;
