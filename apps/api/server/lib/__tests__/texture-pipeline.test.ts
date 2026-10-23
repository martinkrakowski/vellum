import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildTextureGenerator,
  DEFAULT_OPENROUTER_MODELS,
  openRouterModels,
  resetTextureGeneratorCache,
} from "../texture-pipeline.js";

const KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "OPENROUTER_API_KEY",
  "FIREFLY_CLIENT_ID",
  "FIREFLY_CLIENT_SECRET",
];

/** Clear every provider credential so the chain must reach the procedural floor. */
function clearKeys() {
  for (const key of KEYS) vi.stubEnv(key, "");
}

// Memoization would otherwise return a generator composed under earlier env.
beforeEach(() => resetTextureGeneratorCache());
afterEach(() => vi.unstubAllEnvs());

describe("buildTextureGenerator — key-gated fallback chain", () => {
  it("produces the procedural floor when no provider keys are set", async () => {
    clearKeys();
    const result = await buildTextureGenerator().generate({ prompt: "x", attempt: 1 });
    expect(result.source).toBe("procedural");
    expect(result.url).toBe("/assets/textures/label-attempt-1.png");
  });

  it("procedural selection is the floor regardless of keys", async () => {
    vi.stubEnv("GEMINI_API_KEY", "present");
    const result = await buildTextureGenerator("procedural").generate({
      prompt: "x",
      attempt: 2,
    });
    expect(result.source).toBe("procedural");
    expect(result.url).toBe("/assets/textures/label-attempt-2.png");
  });

  it("a blank primary key does not mask a valid alias (imagen still selected)", async () => {
    // GEMINI_API_KEY="" must NOT hide a real GOOGLE_API_KEY — the imagen tier
    // is chosen (its constructor accepts the alias), not skipped to procedural.
    clearKeys();
    vi.stubEnv("GOOGLE_API_KEY", "real-key");
    // No network call is made here — we only assert the tier was composed by
    // checking it is not the procedural floor's identity.
    const gen = buildTextureGenerator("imagen");
    expect(gen).not.toBeInstanceOf(
      (await import("../../adapters/ProceduralTextureGenerator.js"))
        .ProceduralTextureGenerator,
    );
  });

  it("memoizes the composed generator per selection", () => {
    clearKeys();
    vi.stubEnv("FIREFLY_CLIENT_ID", "id");
    vi.stubEnv("FIREFLY_CLIENT_SECRET", "secret");
    const a = buildTextureGenerator("firefly");
    const b = buildTextureGenerator("firefly");
    expect(a).toBe(b);
  });
});

describe("openRouterModels — ordered diffusion fallback list", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to the built-in spread", () => {
    vi.stubEnv("OPENROUTER_IMAGE_MODELS", "");
    vi.stubEnv("OPENROUTER_IMAGE_MODEL", "");
    expect(openRouterModels()).toEqual([...DEFAULT_OPENROUTER_MODELS]);
  });

  it("parses a comma-separated OPENROUTER_IMAGE_MODELS list, trimmed", () => {
    vi.stubEnv("OPENROUTER_IMAGE_MODELS", " a/x , b/y ,, c/z ");
    expect(openRouterModels()).toEqual(["a/x", "b/y", "c/z"]);
  });

  it("falls back to the single OPENROUTER_IMAGE_MODEL when the list is unset", () => {
    vi.stubEnv("OPENROUTER_IMAGE_MODELS", "");
    vi.stubEnv("OPENROUTER_IMAGE_MODEL", "solo/model");
    expect(openRouterModels()).toEqual(["solo/model"]);
  });
});
