import type {
  ImageTextureGeneratorPort,
  TextureRequest,
  TextureResult,
} from "@vellum/texture-generation";
import { describe, expect, it, vi } from "vitest";

import {
  GeminiTextureGenerator,
  type ImagenClient,
} from "../GeminiTextureGenerator.js";

const request: TextureRequest = { prompt: "a botanical label", attempt: 1 };

/** A stub floor that always succeeds, so we can assert fallback delegation. */
class StubFloor implements ImageTextureGeneratorPort {
  async generate(): Promise<TextureResult> {
    return { url: "/assets/textures/label-attempt-1.png", source: "procedural" };
  }
}

function clientReturning(imageBytes?: string): ImagenClient {
  return {
    models: {
      generateImages: vi.fn(async () => ({
        generatedImages: imageBytes ? [{ image: { imageBytes } }] : [],
      })),
    },
  };
}

function clientThrowing(): ImagenClient {
  return {
    models: { generateImages: vi.fn(async () => { throw new Error("rate limit"); }) },
  };
}

describe("GeminiTextureGenerator", () => {
  it("returns an imagen-sourced data URL on success", async () => {
    const gen = new GeminiTextureGenerator({
      apiKey: "k",
      client: clientReturning("QUJD"),
    });
    const result = await gen.generate(request);
    expect(result.source).toBe("imagen");
    expect(result.url).toBe("data:image/png;base64,QUJD");
  });

  it("delegates to the fallback on API failure (observable degradation)", async () => {
    const gen = new GeminiTextureGenerator({
      apiKey: "k",
      client: clientThrowing(),
      fallback: new StubFloor(),
    });
    const result = await gen.generate(request);
    expect(result.source).toBe("procedural");
  });

  it("treats an empty image response as a failure and falls back", async () => {
    const gen = new GeminiTextureGenerator({
      apiKey: "k",
      client: clientReturning(undefined),
      fallback: new StubFloor(),
    });
    expect((await gen.generate(request)).source).toBe("procedural");
  });

  it("rejects when generation fails and no fallback is provided", async () => {
    const gen = new GeminiTextureGenerator({ apiKey: "k", client: clientThrowing() });
    await expect(gen.generate(request)).rejects.toThrow(/rate limit/);
  });
});
