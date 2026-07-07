import { err, ok, type Result } from "@vellum/shared";
import {
  FeedbackCategorySchema,
  FeedbackPayloadSchema,
  type FeedbackPayload,
} from "@vellum/scene-types";

/**
 * Gate in front of the REJECT transition: the state machine only accepts
 * feedback whose category maps to a known correction behaviour. An unknown
 * category would produce a rejection with no observable consequence —
 * exactly the failure mode the demo argues against.
 */
export function validateFeedback(
  candidate: unknown,
): Result<FeedbackPayload, string> {
  const parsed = FeedbackPayloadSchema.safeParse(candidate);
  if (!parsed.success) {
    const detail = parsed.error.issues[0];
    return err(
      detail ? `${detail.path.join(".")}: ${detail.message}` : "invalid feedback",
    );
  }
  return ok(parsed.data);
}

/** The categories the review UI may offer. Derived, never hand-listed twice. */
export const KNOWN_CATEGORIES = FeedbackCategorySchema.options;
