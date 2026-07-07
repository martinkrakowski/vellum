import type {
  FeedbackPayload,
  IterationStatus,
  SceneConfig,
  SceneIteration,
} from "@vellum/scene-types";

/**
 * Pure factory for the append-only ledger entry that travels with every
 * state transition. Timestamps are injected — this module never reads a
 * clock.
 */
export function buildIteration(
  config: SceneConfig,
  startedAt: string,
): SceneIteration {
  return {
    attempt: config.attempt,
    config,
    status: "PENDING",
    feedback: null,
    distortionWarning: false,
    startedAt,
    resolvedAt: null,
  };
}

/**
 * Close an iteration with a decision. Returns a new entry — the ledger is
 * append-only in spirit: entries are replaced wholesale, never mutated.
 */
export function resolveIteration(
  iteration: SceneIteration,
  status: Exclude<IterationStatus, "PENDING">,
  feedback: FeedbackPayload | null,
  resolvedAt: string,
): SceneIteration {
  return { ...iteration, status, feedback, resolvedAt };
}

/** Flag the active iteration after the distortion scan. Non-mutating. */
export function withDistortionWarning(
  iteration: SceneIteration,
  distortionWarning: boolean,
): SceneIteration {
  return { ...iteration, distortionWarning };
}
