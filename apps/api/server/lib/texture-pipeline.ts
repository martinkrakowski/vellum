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
 * OpenRouter image models tried in order within the OpenRouter tier — a spread
 * of diffusion/image providers so one being rate-limited or unavailable falls
 * through to the next before the procedural floor. Override with
 * OPENROUTER_IMAGE_MODELS (comma-separated) or OPENROUTER_IMAGE_MODEL (single).
 */
export const DEFAULT_OPENROUTER_MODELS: readonly string[] = [
  "black-forest-labs/flux-1.1-pro",
  "x-ai/grok-imagine-image-quality",
  "google/gemini-2.5-flash-image",
];

/** Resolve the ordered OpenRouter model list from env, or the default spread. */
export function openRouterModels(): string[] {
  const list = envValue("OPENROUTER_IMAGE_MODELS")
    ?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (list && list.length > 0) return list;
  const single = envValue("OPENROUTER_IMAGE_MODEL");
  return single ? [single] : [...DEFAULT_OPENROUTER_MODELS];
}

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

  // Chain the OpenRouter models into a fallback ladder over the procedural
  // floor: models[0] → models[1] → … → procedural. reduceRight folds from the
  // last model (fallback = procedural) up to the first, so the first is tried
  // first. A stalled/rate-limited model degrades to the next diffusion model.
  const openRouter = (): ImageTextureGeneratorPort =>
    openRouterKey
      ? openRouterModels().reduceRight<ImageTextureGeneratorPort>(
          (fallback, model) =>
            new OpenRouterTextureGenerator({
              apiKey: openRouterKey,
              model,
              fallback,
            }),
          procedural,
        )
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
