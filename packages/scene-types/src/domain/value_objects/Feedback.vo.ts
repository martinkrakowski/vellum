import { z } from "zod";

/**
 * The two categories that ship with the demo. The category is the demo's
 * primary claim: it affects behaviour, not just the label —
 * UV_DISTORTION produces a deterministic transform delta on re-run,
 * OTHER re-runs texture generation with the transform unchanged.
 */
export const FeedbackCategorySchema = z.enum(["UV_DISTORTION", "OTHER"]);

export type FeedbackCategory = z.infer<typeof FeedbackCategorySchema>;

export const FeedbackPayloadSchema = z.object({
  category: FeedbackCategorySchema,
  /** Free-text rationale — required so the audit trail reads as a decision record. */
  note: z.string().min(1),
  /** ISO-8601. Stamped by the UI at submission time. */
  createdAt: z.string(),
});

export type FeedbackPayload = z.infer<typeof FeedbackPayloadSchema>;
