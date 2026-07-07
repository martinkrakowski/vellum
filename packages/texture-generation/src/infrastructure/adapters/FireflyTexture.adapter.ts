import type { TextureGenerationPort } from "../../application/ports/in/TextureGeneration.in-port.js";

/**
 * The production seam. In a live deployment this adapter calls Adobe
 * Firefly's text-to-image API with the session prompt plus the corrective
 * conditioning derived from feedback, uploads the result to asset storage,
 * and returns its URL. It exists so the swap is a one-line binding change
 * in the composition root — nothing upstream of TextureGenerationPort
 * knows the difference.
 */
export class FireflyTextureAdapter implements TextureGenerationPort {
  constructor(
    private readonly options: { endpoint: string; apiKeyRef: string },
  ) {}

  textureUrlFor(attempt: number): string {
    throw new Error(
      `FireflyTextureAdapter is a stub (attempt ${attempt}, endpoint ${this.options.endpoint}). ` +
        "Bind MockTextureAdapter for the demo.",
    );
  }
}
