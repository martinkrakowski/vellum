import {
  ALLOWED_TEXTURE_MODELS,
  buildTextureGenerator,
} from "../../../lib/texture-pipeline.js";

interface GenerateBody {
  prompt?: unknown;
  attempt?: unknown;
  model?: unknown;
}

/**
 * POST /api/texture/generate — generate a flat label texture from a prompt.
 * Runs the key-gated Firefly → Imagen → OpenRouter → procedural chain
 * server-side (keys never reach the browser) and returns { url, source }. With
 * no keys configured it returns the procedural floor, so the demo runs offline.
 */
export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as GenerateBody | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const attempt =
    typeof body?.attempt === "number" && Number.isInteger(body.attempt)
      ? body.attempt
      : 1;
  const model = typeof body?.model === "string" ? body.model : undefined;

  if (!prompt) {
    setResponseStatus(event, 400);
    return { error: "prompt is required" };
  }
  if (model && !ALLOWED_TEXTURE_MODELS.includes(model)) {
    setResponseStatus(event, 400);
    return { error: `unknown model: ${model}` };
  }

  const generator = buildTextureGenerator(model);
  return generator.generate({ prompt, attempt, model });
});
