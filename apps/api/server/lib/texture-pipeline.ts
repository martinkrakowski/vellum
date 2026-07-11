import type { ImageTextureGeneratorPort } from "@vellum/texture-generation";

import { FireflyTextureGenerator } from "../adapters/FireflyTextureGenerator.js";
import { GeminiTextureGenerator } from "../adapters/GeminiTextureGenerator.js";
import { OpenRouterTextureGenerator } from "../adapters/OpenRouterTextureGenerator.js";
import { ProceduralTextureGenerator } from "../adapters/ProceduralTextureGenerator.js";
import { loadEnv } from "./env.js";
import { envValue } from "./util.js";

// Load .env before any process.env read below. Called (not a bare side-effect
// import) so Nitro's bundler can't tree-shake it — that would leave the keys
// unset and silently fall back to the procedural floor.
loadEnv();

/**
 * Server-side allowlist for the untrusted `?model=` selector — the security
 * boundary so callers can't invoke arbitrary/costly providers. Anything else is
 * rejected at the route.
 */
export const ALLOWED_TEXTURE_MODELS: readonly string[] = [
  "firefly",
  "imagen",
  "openrouter",
  "procedural",
];

/**
 * Compose the texture generator. Each provider is only used when its credentials
 * are present (else it falls through), and every tier degrades to the next, over
 * a procedural floor that never fails — so a keyless run produces the static
 * label offline. Adopting a provider was a one-line addition here; nothing above
 * the port changed.
 *
 *   default / "firefly" → Firefly → Imagen → OpenRouter → procedural
 *   "imagen"            → Imagen → OpenRouter → procedural
 *   "openrouter"        → OpenRouter → procedural
 *   "procedural"        → procedural only
 */
/**
 * Composed generators are memoized per selection so a stateful adapter
 * (FireflyTextureGenerator caches its IMS token and coalesces grants) survives
 * across requests — the route builds per call, but re-authenticating Adobe on
 * every request would defeat the cache and burst IMS.
 */
const cache = new Map<string, ImageTextureGeneratorPort>();

export function buildTextureGenerator(selected?: string): ImageTextureGeneratorPort {
  const key = selected ?? "default";
  const cached = cache.get(key);
  if (cached) return cached;
  const generator = compose(selected);
  cache.set(key, generator);
  return generator;
}

/** Test-only: drop the memoized generators so env stubs take effect. */
export function resetTextureGeneratorCache(): void {
  cache.clear();
}

function compose(selected?: string): ImageTextureGeneratorPort {
  const procedural = new ProceduralTextureGenerator();
  // envValue trims and treats blank as unset, so a blank GEMINI_API_KEY (as in
  // .env.example) never masks a valid GOOGLE_API_KEY.
  const geminiKey = envValue("GEMINI_API_KEY") ?? envValue("GOOGLE_API_KEY");
  const openRouterKey = envValue("OPENROUTER_API_KEY");
  const fireflyId = envValue("FIREFLY_CLIENT_ID");
  const fireflySecret = envValue("FIREFLY_CLIENT_SECRET");

  const openRouter = (): ImageTextureGeneratorPort =>
    openRouterKey
      ? new OpenRouterTextureGenerator({
          apiKey: openRouterKey,
          model: envValue("OPENROUTER_IMAGE_MODEL"),
          fallback: procedural,
        })
      : procedural;

  const imagen = (): ImageTextureGeneratorPort =>
    geminiKey
      ? new GeminiTextureGenerator({
          apiKey: geminiKey,
          model: envValue("IMAGEN_MODEL"),
          fallback: openRouter(),
        })
      : openRouter();

  const firefly = (): ImageTextureGeneratorPort =>
    fireflyId && fireflySecret
      ? new FireflyTextureGenerator({
          clientId: fireflyId,
          clientSecret: fireflySecret,
          fallback: imagen(),
        })
      : imagen();

  if (selected === "procedural") return procedural;
  if (selected === "openrouter") return openRouter();
  if (selected === "imagen") return imagen();
  // default / "firefly" / unset → the full Firefly-first chain
  return firefly();
}
