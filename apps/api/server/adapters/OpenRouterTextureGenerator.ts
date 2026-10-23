import type {
  ImageTextureGeneratorPort,
  TextureRequest,
  TextureResult,
} from "@vellum/texture-generation";

import { buildLabelPrompt } from "../lib/prompt.js";
import { deadline, GENERATION_TIMEOUT_MS, SHORT_TIMEOUT_MS } from "../lib/util.js";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
/** A different provider from Imagen by default, so it's a real second source. */
const DEFAULT_MODEL = "x-ai/grok-imagine-image-quality";

/** Minimal shape of the OpenAI-compatible chat-completion response we read. */
interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      images?: Array<{ image_url?: { url?: string }; url?: string }>;
    };
  }>;
}

export interface OpenRouterTextureGeneratorOptions {
  readonly apiKey: string;
  /** OpenRouter model id (default `x-ai/grok-imagine-image-quality`). */
  readonly model?: string;
  /** Used on any failure so a run never aborts. */
  readonly fallback?: ImageTextureGeneratorPort;
}

/**
 * An HTTP error response from OpenRouter itself (not a thrown fetch error).
 * `status` is the HTTP status; `providerMessage` is the envelope's
 * `error.message` when the body parses as JSON of that shape and the field is a
 * string, otherwise `undefined`.
 */
export class OpenRouterHttpError extends Error {
  readonly status: number;
  readonly providerMessage: string | undefined;

  constructor(status: number, bodyText: string) {
    super(`OpenRouter HTTP ${status}: ${bodyText.slice(0, 200)}`);
    this.name = "OpenRouterHttpError";
    this.status = status;
    this.providerMessage = parseProviderMessage(bodyText);
  }
}

/** Never throws; returns the envelope's `error.message`, or undefined. */
function parseProviderMessage(bodyText: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const error = (parsed as { error?: unknown }).error;
    if (typeof error !== "object" || error === null) return undefined;
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  } catch {
    return undefined;
  }
}

/** True only for OpenRouter's own HTTP 400 that reports a modality mismatch. */
function isModalityMismatch(error: unknown): boolean {
  return (
    error instanceof OpenRouterHttpError &&
    error.status === 400 &&
    typeof error.providerMessage === "string" &&
    /modalit/i.test(error.providerMessage)
  );
}

/**
 * OpenRouter's OpenAI-compatible image generation (Grok Imagine, Nano Banana,
 * GPT Image, …) as an ImageTextureGeneratorPort. The second GenAI source: when
 * Imagen is rate-limited/unavailable, the Gemini adapter falls back here before
 * the procedural floor.
 */
export class OpenRouterTextureGenerator implements ImageTextureGeneratorPort {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallback?: ImageTextureGeneratorPort;

  constructor(options: OpenRouterTextureGeneratorOptions) {
    this.apiKey = options.apiKey;
    this.model =
      options.model && options.model.length > 0 ? options.model : DEFAULT_MODEL;
    this.fallback = options.fallback;
  }

  async generate(request: TextureRequest): Promise<TextureResult> {
    const prompt = buildLabelPrompt(request.prompt);
    try {
      // Image-only output (Grok Imagine, Flux, …). Text+image models (Nano
      // Banana, GPT Image) reject that and need ["image","text"] — so retry
      // once. The retry fires only for OpenRouter's own HTTP 400 that reports a
      // modality mismatch; a 429, a 5xx, a network or timeout failure, or a
      // failed image download must never cause a second generation.
      let url: string | undefined;
      try {
        url = await this.request(prompt, ["image"]);
      } catch (error) {
        if (isModalityMismatch(error)) {
          url = await this.request(prompt, ["image", "text"]);
        } else {
          throw error;
        }
      }
      if (!url) throw new Error("OpenRouter returned no image data");
      // http URLs are fetched to a data URL so the browser never cross-origin-
      // taints the WebGL texture; data URLs pass through.
      const dataUrl = url.startsWith("data:") ? url : await this.toDataUrl(url);
      return { url: dataUrl, source: "openrouter" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.fallback) {
        console.warn(
          `[OpenRouterTextureGenerator] failed (attempt ${request.attempt}); using fallback. ${message}`,
        );
        return this.fallback.generate(request);
      }
      throw new Error(message);
    }
  }

  /** One chat-completion image request; returns the image URL/data-URL (or undefined). */
  private async request(
    prompt: string,
    modalities: string[],
  ): Promise<string | undefined> {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      signal: deadline(GENERATION_TIMEOUT_MS),
      body: JSON.stringify({
        model: this.model,
        modalities,
        image_config: { aspect_ratio: "1:1" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) {
      const bodyText = await response.text();
      throw new OpenRouterHttpError(response.status, bodyText);
    }
    const body = (await response.json()) as OpenRouterResponse;
    const image = body.choices?.[0]?.message?.images?.[0];
    return image?.image_url?.url ?? image?.url;
  }

  /** Fetch a remote image URL and encode it as a data URL (server-side, no CORS). */
  private async toDataUrl(url: string): Promise<string> {
    const response = await fetch(url, { signal: deadline(SHORT_TIMEOUT_MS) });
    if (!response.ok)
      throw new Error(`OpenRouter image fetch failed (HTTP ${response.status})`);
    const contentType = response.headers.get("content-type") ?? "image/png";
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  }
}
