import { z } from "zod";

/**
 * Material-level UV transform applied to the label texture. This is the
 * observable artifact of a correction: rejecting with UV_DISTORTION must
 * change these numbers, and the change must be visible on the mesh.
 */
export const TextureTransformSchema = z.object({
  repeatX: z.number().positive(),
  repeatY: z.number().positive(),
  offsetX: z.number(),
  offsetY: z.number(),
  /** Radians, around the UV center. */
  rotation: z.number(),
});

export type TextureTransform = z.infer<typeof TextureTransformSchema>;

export const IDENTITY_TRANSFORM: TextureTransform = {
  repeatX: 1,
  repeatY: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};
