import { z } from "zod";
import { SceneIterationSchema } from "./SceneIteration.vo.js";

/**
 * The governance artifact synthesised on Approve (or max-retries). Designed
 * as an ADR-style decision record, not a debug log. brandGuidelinesVersion
 * records which version of the brand rules was active during generation —
 * an enterprise concern absent from competitor tooling.
 */
export const AuditTrailSchema = z.object({
  sessionId: z.string().min(1),
  prompt: z.string().min(1),
  brandGuidelinesVersion: z.string().min(1),
  iterations: z.array(SceneIterationSchema).min(1),
  outcome: z.enum(["APPROVED", "MAX_RETRIES_REACHED"]),
  /** Human-readable synthesis: what was rejected, why, what changed. */
  decisionSummary: z.string(),
  exportedAt: z.string(),
});

export type AuditTrail = z.infer<typeof AuditTrailSchema>;
