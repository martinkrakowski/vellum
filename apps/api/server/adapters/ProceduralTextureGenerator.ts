import type {
  ImageTextureGeneratorPort,
  TextureRequest,
  TextureResult,
} from "@vellum/texture-generation";

/**
 * The offline floor — the pre-baked, attempt-keyed label PNGs served from the
 * web app's /public. It never fails and never calls a model, so a keyless run
 * degrades to exactly the demo's original behaviour (and the attempt-keyed
 * correction story still works). Distinct URLs per attempt dodge the
 * THREE.TextureLoader cache.
 */
export class ProceduralTextureGenerator implements ImageTextureGeneratorPort {
  constructor(private readonly basePath = "/assets/textures") {}

  async generate(request: TextureRequest): Promise<TextureResult> {
    const key = Math.min(Math.max(request.attempt, 1), 2);
    return { url: `${this.basePath}/label-attempt-${key}.png`, source: "procedural" };
  }
}
