/**
 * Provenance of a label texture — which provider produced it. Propagates up so
 * the review surface and the audit trail show what actually generated the
 * artwork, and a keyless/offline run is never silently disguised as a real one.
 */
export type TextureSource = "firefly" | "imagen" | "openrouter" | "procedural";

export interface TextureRequest {
  /** The user's texture prompt. */
  readonly prompt: string;
  /** 1-based attempt number (drives the offline floor's attempt-keyed asset). */
  readonly attempt: number;
  /** Optional explicit provider/model selection; unset = the default chain. */
  readonly model?: string;
}

export interface TextureResult {
  /**
   * Texture URL — a relative/absolute http path (the procedural floor's static
   * PNG) or a `data:` URL (a model-generated image fetched server-side, so the
   * browser never cross-origin-taints the WebGL texture).
   */
  readonly url: string;
  /** Where the texture came from. */
  readonly source: TextureSource;
}

/**
 * Outbound seam for label-texture generation. Implemented server-side by real
 * model adapters (Adobe Firefly, Google Imagen, OpenRouter) composed into a
 * key-gated fallback chain over a procedural floor. Async and
 * provenance-carrying — the production successor to the demo-era synchronous
 * `TextureGenerationPort` (which stays for the offline mock path).
 */
export interface ImageTextureGeneratorPort {
  generate(request: TextureRequest): Promise<TextureResult>;
}
