import { z } from "zod";
import { TextureTransformSchema } from "./TextureTransform.vo.js";

/**
 * Everything the renderer needs to realise one attempt. Produced by the
 * pipeline, consumed through ScenePort — the renderer never sees anything
 * richer than this.
 */
export const SceneConfigSchema = z.object({
  /** 1-based attempt number within a review session. */
  attempt: z.number().int().min(1),
  prompt: z.string().min(1),
  /** Attempt-keyed URL (label-attempt-N.png) — avoids TextureLoader cache collisions. */
  textureUrl: z.string().min(1),
  textureTransform: TextureTransformSchema,
  /**
   * GLB to load, or null to use the built-in parametric bottle. The demo
   * ships null; a calibrated GLB is a drop-in swap.
   */
  modelUrl: z.string().nullable(),
});

export type SceneConfig = z.infer<typeof SceneConfigSchema>;
