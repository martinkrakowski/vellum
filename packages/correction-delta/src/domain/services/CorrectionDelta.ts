import type {
  FeedbackCategory,
  SceneConfig,
  TextureTransform,
} from "@vellum/scene-types";

/**
 * Deterministic mapping from feedback category to a TextureTransform delta.
 * The contract: every category must produce an observable, testable change
 * in the next iteration — not decoration.
 *
 * UV_DISTORTION widens horizontal repeat and re-centres the offset, which
 * counteracts the bevel-region compression the label shows on the bottle's
 * shoulder taper. OTHER is deliberately empty: it re-runs texture
 * generation with the transform untouched, proving that the category —
 * not the act of rejecting — drives the correction.
 */
export const CATEGORY_CORRECTIONS: Record<
  FeedbackCategory,
  Partial<TextureTransform>
> = {
  UV_DISTORTION: {
    repeatX: 1.35,
    offsetX: -0.175,
  },
  OTHER: {},
};

/**
 * Merge the previous attempt's config with the category's correction delta
 * to produce the attempt-N+1 SceneConfig. Pure: no clock, no I/O, inputs
 * are never mutated. The next texture URL is injected by the caller
 * (texture generation owns attempt-keyed naming).
 */
export function applyCorrectionDelta(
  previous: SceneConfig,
  category: FeedbackCategory,
  nextTextureUrl: string,
): SceneConfig {
  return {
    ...previous,
    attempt: previous.attempt + 1,
    textureUrl: nextTextureUrl,
    textureTransform: {
      ...previous.textureTransform,
      ...CATEGORY_CORRECTIONS[category],
    },
  };
}
