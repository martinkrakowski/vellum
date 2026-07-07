/**
 * The texture source seam. The demo binds MockTextureAdapter (pre-baked,
 * attempt-keyed assets); FireflyTextureAdapter is the production seam the
 * demo narrates but does not call.
 */
export interface TextureGenerationPort {
  /** URL of the label texture for the given 1-based attempt. */
  textureUrlFor(attempt: number): string;
}
