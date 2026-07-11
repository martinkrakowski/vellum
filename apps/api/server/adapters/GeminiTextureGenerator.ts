import { GoogleGenAI } from "@google/genai";
import type {
  ImageTextureGeneratorPort,
  TextureRequest,
  TextureResult,
} from "@vellum/texture-generation";

import { buildLabelPrompt } from "../lib/prompt.js";

/** Default Imagen model (override with the IMAGEN_MODEL env var). */
const DEFAULT_MODEL = "imagen-4.0-generate-001";

/** The slice of the `@google/genai` client this adapter actually uses. */
export interface ImagenClient {
  models: {
    generateImages(args: {
      model: string;
      prompt: string;
      config: { numberOfImages: number; aspectRatio: string };
    }): Promise<{ generatedImages?: Array<{ image?: { imageBytes?: string } }> }>;
  };
}

export interface GeminiTextureGeneratorOptions {
  readonly apiKey: string;
  readonly model?: string;
  /** Used on any API failure (no access, rate limit, network) so a run never aborts. */
  readonly fallback?: ImageTextureGeneratorPort;
  /** Injectable client seam (defaults to a real GoogleGenAI) — lets tests stub the SDK. */
  readonly client?: ImagenClient;
}

/**
 * Google Imagen (via @google/genai) as an ImageTextureGeneratorPort. Generates a
 * flat label texture from the prompt; on any failure it degrades to the injected
 * fallback, whose source propagates up so a degraded run is observable rather
 * than silently "fine".
 */
export class GeminiTextureGenerator implements ImageTextureGeneratorPort {
  private readonly ai: ImagenClient;
  private readonly model: string;
  private readonly fallback?: ImageTextureGeneratorPort;

  constructor(options: GeminiTextureGeneratorOptions) {
    this.ai = options.client ?? new GoogleGenAI({ apiKey: options.apiKey });
    this.model =
      options.model && options.model.length > 0 ? options.model : DEFAULT_MODEL;
    this.fallback = options.fallback;
  }

  async generate(request: TextureRequest): Promise<TextureResult> {
    try {
      const response = await this.ai.models.generateImages({
        model: this.model,
        prompt: buildLabelPrompt(request.prompt),
        config: { numberOfImages: 1, aspectRatio: "1:1" },
      });
      const bytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (!bytes) throw new Error("Imagen returned no image data");
      return { url: `data:image/png;base64,${bytes}`, source: "imagen" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.fallback) {
        console.warn(
          `[GeminiTextureGenerator] Imagen failed (attempt ${request.attempt}); using fallback. ${message}`,
        );
        return this.fallback.generate(request);
      }
      throw new Error(message);
    }
  }
}
