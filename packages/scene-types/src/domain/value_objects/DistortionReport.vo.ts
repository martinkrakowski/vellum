import { z } from "zod";

/**
 * Result of the client-side UV distortion heuristic: texel density sampled
 * at the bevel region versus the front face. Ratios above the threshold
 * raise the amber warning before the human orbits to the problem angle.
 */
export const DistortionReportSchema = z.object({
  /** Bevel-region texel density ÷ front-face texel density. 1.0 = uniform. */
  stretchRatio: z.number().nonnegative(),
  threshold: z.number().positive(),
  distortionWarning: z.boolean(),
});

export type DistortionReport = z.infer<typeof DistortionReportSchema>;
