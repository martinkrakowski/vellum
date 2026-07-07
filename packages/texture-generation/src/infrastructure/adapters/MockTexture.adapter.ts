import type { TextureGenerationPort } from "../../application/ports/in/TextureGeneration.in-port.js";

/**
 * Pre-baked demo textures with attempt-keyed filenames — distinct URLs per
 * attempt so THREE.TextureLoader's cache can never serve attempt 1's image
 * to attempt 2. Only two assets ship; later attempts reuse the corrected
 * one (the transform delta, not the bitmap, is what changes from then on).
 */
export class MockTextureAdapter implements TextureGenerationPort {
  constructor(private readonly basePath = "/assets/textures") {}

  textureUrlFor(attempt: number): string {
    const key = Math.min(Math.max(attempt, 1), 2);
    return `${this.basePath}/label-attempt-${key}.png`;
  }
}
