import type {
  ImageTextureGeneratorPort,
  TextureRequest,
  TextureResult,
} from "@vellum/texture-generation";

import { buildLabelPrompt } from "../lib/prompt.js";
import { deadline, GENERATION_TIMEOUT_MS, SHORT_TIMEOUT_MS } from "../lib/util.js";

/** Adobe IMS token endpoint (server-to-server client-credentials flow). */
const IMS_TOKEN_ENDPOINT = "https://ims-na1.adobelogin.com/ims/token/v3";
/** Firefly Services image generation (v3). */
const FIREFLY_GENERATE_ENDPOINT = "https://firefly-api.adobe.io/v3/images/generate";
const DEFAULT_SCOPE = "openid,AdobeID,firefly_api,ff_apis";
/** Stop reusing a cached IMS token this long before its reported expiry. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000;
const DEFAULT_TOKEN_TTL_SECONDS = 5 * 60;
/** Square label texture size. */
const LABEL_SIZE = 1024;

interface ImsTokenResponse {
  access_token?: string;
  expires_in?: number;
}
interface FireflyGenerateResponse {
  outputs?: Array<{ image?: { url?: string } }>;
}

export interface FireflyTextureGeneratorOptions {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly scope?: string;
  /** Used on any failure (auth, generation, network) so a run never aborts. */
  readonly fallback?: ImageTextureGeneratorPort;
}

/**
 * Adobe Firefly Services (v3 image generation) as an ImageTextureGeneratorPort —
 * the primary, on-brand generator. Authenticates with Adobe IMS via the
 * client-credentials grant (token cached until shortly before expiry, concurrent
 * grants coalesced), generates a flat label texture, fetches the presigned asset
 * server-side, and returns it as a data URL (so the browser never
 * cross-origin-taints the WebGL texture). Degrades to the injected fallback on
 * any failure.
 */
export class FireflyTextureGenerator implements ImageTextureGeneratorPort {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scope: string;
  private readonly fallback?: ImageTextureGeneratorPort;
  private cachedToken?: { token: string; expiresAt: number };
  private authRequest?: Promise<string>;

  constructor(options: FireflyTextureGeneratorOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.scope =
      options.scope && options.scope.length > 0 ? options.scope : DEFAULT_SCOPE;
    this.fallback = options.fallback;
  }

  async generate(request: TextureRequest): Promise<TextureResult> {
    try {
      const token = await this.authenticate();
      const url = await this.generateImage(token, buildLabelPrompt(request.prompt));
      const dataUrl = await this.toDataUrl(url);
      return { url: dataUrl, source: "firefly" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.fallback) {
        console.warn(
          `[FireflyTextureGenerator] failed (attempt ${request.attempt}); using fallback. ${message}`,
        );
        return this.fallback.generate(request);
      }
      throw new Error(message);
    }
  }

  /**
   * Bearer token for Firefly calls. IMS client-credentials tokens are long-lived,
   * so the token is cached until shortly before expiry and concurrent generations
   * share a single in-flight grant instead of bursting the token endpoint. A
   * settled grant always clears itself, so a failed one is retried next time.
   */
  private async authenticate(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt)
      return this.cachedToken.token;
    this.authRequest ??= this.requestToken().finally(() => {
      this.authRequest = undefined;
    });
    return this.authRequest;
  }

  private async requestToken(): Promise<string> {
    const response = await fetch(IMS_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      signal: deadline(SHORT_TIMEOUT_MS),
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: this.scope,
      }),
    });
    if (!response.ok)
      throw new Error(`Adobe IMS auth failed (HTTP ${response.status})`);
    const body = (await response.json()) as ImsTokenResponse;
    if (!body.access_token) throw new Error("Adobe IMS returned no access token");
    const ttlMs = (body.expires_in ?? DEFAULT_TOKEN_TTL_SECONDS) * 1000;
    this.cachedToken = {
      token: body.access_token,
      expiresAt: Date.now() + ttlMs - TOKEN_EXPIRY_MARGIN_MS,
    };
    return body.access_token;
  }

  /** One Firefly generate call; returns the output image URL. */
  private async generateImage(token: string, prompt: string): Promise<string> {
    const response = await fetch(FIREFLY_GENERATE_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "x-api-key": this.clientId,
        "content-type": "application/json",
      },
      signal: deadline(GENERATION_TIMEOUT_MS),
      body: JSON.stringify({
        prompt,
        numVariations: 1,
        size: { width: LABEL_SIZE, height: LABEL_SIZE },
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Firefly HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`,
      );
    }
    const url = ((await response.json()) as FireflyGenerateResponse).outputs?.[0]
      ?.image?.url;
    if (!url) throw new Error("Firefly returned no image URL");
    return url;
  }

  /** Firefly returns a presigned URL; fetch the bytes and encode as a data URL. */
  private async toDataUrl(url: string): Promise<string> {
    const response = await fetch(url, { signal: deadline(SHORT_TIMEOUT_MS) });
    if (!response.ok)
      throw new Error(`Firefly image fetch failed (HTTP ${response.status})`);
    const contentType = response.headers.get("content-type") ?? "image/png";
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  }
}
