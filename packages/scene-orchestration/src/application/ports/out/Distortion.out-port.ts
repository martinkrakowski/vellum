import type { DistortionReport, SceneConfig } from "@vellum/scene-types";

/**
 * Post-configure guardrail: sample the applied result and report UV
 * stretch before the human orbits to the problem angle. Implemented by
 * the distortion-detection context against the live label geometry.
 */
export interface DistortionPort {
  evaluate(config: SceneConfig): Promise<DistortionReport>;
}
