import type { DistortionPort } from "@vellum/scene-orchestration";
import type { DistortionReport, SceneConfig } from "@vellum/scene-types";

import {
  computeStretchRatio,
  DEFAULT_STRETCH_THRESHOLD,
  type GeometrySample,
} from "../../domain/services/StretchRatio.js";

/**
 * DistortionPort against the live label geometry. The sampler is injected
 * at the composition root (the scene adapter exposes its label mesh data
 * once configure() resolves).
 *
 * The report is transform-aware: the geometric ratio is divided by the
 * active repeatX/repeatY anisotropy, because a horizontal repeat
 * correction re-balances the taper's vertical smear — that is exactly how
 * the UV_DISTORTION delta earns its keep, and why the amber warning
 * clears on the corrected attempt.
 *
 * A null sample — nothing rendered yet — reports no warning rather than
 * crashing the demo; runGeneration only evaluates after configure
 * resolves, so in practice the geometry exists.
 */
export class GeometryDistortionAdapter implements DistortionPort {
  constructor(
    private readonly sampleLabelGeometry: () => GeometrySample | null,
    private readonly threshold = DEFAULT_STRETCH_THRESHOLD,
  ) {}

  async evaluate(config: SceneConfig): Promise<DistortionReport> {
    const sample = this.sampleLabelGeometry();
    if (!sample) {
      return {
        stretchRatio: 1,
        threshold: this.threshold,
        distortionWarning: false,
      };
    }
    const geometric = computeStretchRatio(sample);
    const { repeatX, repeatY } = config.textureTransform;
    const effective = geometric / (repeatX / repeatY);
    const stretchRatio = Math.max(effective, 1 / effective);
    return {
      stretchRatio,
      threshold: this.threshold,
      distortionWarning: stretchRatio > this.threshold,
    };
  }
}
