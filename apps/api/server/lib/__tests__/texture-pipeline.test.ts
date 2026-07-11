import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTextureGenerator } from "../texture-pipeline.js";

/** Clear every provider credential so the chain must reach the procedural floor. */
function clearKeys() {
  for (const key of [
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "OPENROUTER_API_KEY",
    "FIREFLY_CLIENT_ID",
    "FIREFLY_CLIENT_SECRET",
  ]) {
    vi.stubEnv(key, "");
  }
}

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
});
