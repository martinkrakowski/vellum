import type {
  ImageTextureGeneratorPort,
  TextureRequest,
  TextureResult,
} from "@vellum/texture-generation";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OpenRouterTextureGenerator } from "../OpenRouterTextureGenerator.js";

const request: TextureRequest = { prompt: "a botanical label", attempt: 1 };
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/** A stub floor that always succeeds, so we can assert fallback delegation. */
class StubFloor implements ImageTextureGeneratorPort {
  async generate(): Promise<TextureResult> {
    return { url: "/assets/textures/label-attempt-1.png", source: "procedural" };
  }
}

function okImage(url: string): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { images: [{ image_url: { url } }] } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("OpenRouterTextureGenerator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an openrouter-sourced data URL on success and calls fetch once", async () => {
    const dataUrl = "data:image/png;base64,QUJD";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okImage(dataUrl));
    const gen = new OpenRouterTextureGenerator({ apiKey: "k" });
    const result = await gen.generate(request);
    expect(result.source).toBe("openrouter");
    expect(result.url).toBe(dataUrl);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries with text+image modalities on OpenRouter's own 400 modality mismatch", async () => {
    const dataUrl = "data:image/png;base64,QUJD";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 400,
              message: "This model does not support the requested output modalities",
            },
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(okImage(dataUrl));
    const gen = new OpenRouterTextureGenerator({ apiKey: "k" });
    const result = await gen.generate(request);
    expect(result.source).toBe("openrouter");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondInit] = fetchMock.mock.calls[1];
    const secondBody = JSON.parse(String(secondInit?.body)) as {
      modalities?: string[];
    };
    expect(secondBody.modalities).toEqual(["image", "text"]);
  });

  it("does not retry on a 429 and falls back", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("rate limited: modalities quota", { status: 429 }),
      );
    const gen = new OpenRouterTextureGenerator({
      apiKey: "k",
      fallback: new StubFloor(),
    });
    const result = await gen.generate(request);
    expect(result.source).toBe("procedural");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry on a 5xx and falls back", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "upstream failed on modalities" } }),
          { status: 500, headers: { "content-type": "application/json" } },
        ),
      );
    const gen = new OpenRouterTextureGenerator({
      apiKey: "k",
      fallback: new StubFloor(),
    });
    const result = await gen.generate(request);
    expect(result.source).toBe("procedural");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry on a 400 that is not a modality mismatch and falls back", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 400, message: "Invalid model id" } }),
          { status: 400, headers: { "content-type": "application/json" } },
        ),
      );
    const gen = new OpenRouterTextureGenerator({
      apiKey: "k",
      fallback: new StubFloor(),
    });
    const result = await gen.generate(request);
    expect(result.source).toBe("procedural");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry when fetch rejects and falls back", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network down while negotiating modalities"));
    const gen = new OpenRouterTextureGenerator({
      apiKey: "k",
      fallback: new StubFloor(),
    });
    const result = await gen.generate(request);
    expect(result.source).toBe("procedural");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects with the HTTP status when no fallback is configured", async () => {
    vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 400, message: "Invalid model id" } }),
          { status: 400, headers: { "content-type": "application/json" } },
        ),
      );
    const gen = new OpenRouterTextureGenerator({ apiKey: "k" });
    await expect(gen.generate(request)).rejects.toThrow(/OpenRouter HTTP 400/);
  });

  it("does not retry when the image download fails and falls back", async () => {
    const imageUrl = "https://images.example/abc.png";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(okImage(imageUrl))
      .mockResolvedValueOnce(new Response("not found: modalities", { status: 404 }));
    const gen = new OpenRouterTextureGenerator({
      apiKey: "k",
      fallback: new StubFloor(),
    });
    const result = await gen.generate(request);
    expect(result.source).toBe("procedural");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(ENDPOINT);
    expect(fetchMock.mock.calls[1][0]).toBe(imageUrl);
  });
});
