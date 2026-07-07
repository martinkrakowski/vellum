import type { AuditTrail, SceneIteration } from "@vellum/scene-types";

/** The brand-rules version active for this demo build. */
export const BRAND_GUIDELINES_VERSION = "aurora-brand-v1.2";

interface AuditTrailInput {
  sessionId: string;
  prompt: string;
  iterations: SceneIteration[];
  outcome: AuditTrail["outcome"];
  exportedAt: string;
  brandGuidelinesVersion?: string;
}

/**
 * Synthesise the governance artifact from a completed review session.
 * Reads like an ADR: what was attempted, what the human rejected and why,
 * what changed as a consequence. Pure — timestamps injected.
 */
export function buildAuditTrail(input: AuditTrailInput): AuditTrail {
  return {
    sessionId: input.sessionId,
    prompt: input.prompt,
    brandGuidelinesVersion:
      input.brandGuidelinesVersion ?? BRAND_GUIDELINES_VERSION,
    iterations: input.iterations,
    outcome: input.outcome,
    decisionSummary: summarise(input.iterations, input.outcome),
    exportedAt: input.exportedAt,
  };
}

function summarise(
  iterations: SceneIteration[],
  outcome: AuditTrail["outcome"],
): string {
  const lines = iterations.map((iteration) => {
    switch (iteration.status) {
      case "REJECTED":
        return (
          `Attempt ${iteration.attempt}: rejected` +
          ` (${iteration.feedback?.category ?? "UNCATEGORISED"})` +
          (iteration.feedback ? ` — "${iteration.feedback.note}"` : "") +
          (iteration.distortionWarning
            ? " [distortion warning was raised]"
            : "")
        );
      case "APPROVED":
        return `Attempt ${iteration.attempt}: approved by reviewer.`;
      case "PENDING":
        return `Attempt ${iteration.attempt}: unresolved at export time.`;
    }
  });
  const closing =
    outcome === "APPROVED"
      ? "Session closed with human approval."
      : "Session closed after exhausting the retry budget.";
  return [...lines, closing].join("\n");
}
