import {
  ALLOWED_TEXTURE_MODELS,
  buildTextureGenerator,
} from "../../../lib/texture-pipeline.js";

/** Guard against oversized prompts (accidental overload / abuse). */
const MAX_PROMPT_LENGTH = 2_000;

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
  // attempt is a 1-based contract; reject 0/negative rather than silently coerce.
  const attempt =
    typeof body?.attempt === "number" && Number.isInteger(body.attempt)
      ? body.attempt
      : 1;
  const model = typeof body?.model === "string" ? body.model : undefined;

  if (!prompt) {
    setResponseStatus(event, 400);
    return { error: "prompt is required" };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    setResponseStatus(event, 400);
    return { error: `prompt exceeds ${MAX_PROMPT_LENGTH} characters` };
  }
  if (attempt < 1) {
    setResponseStatus(event, 400);
    return { error: "attempt must be a positive integer (1-based)" };
  }
  if (model && !ALLOWED_TEXTURE_MODELS.includes(model)) {
    setResponseStatus(event, 400);
    return { error: `unknown model: ${model}` };
  }

  const generator = buildTextureGenerator(model);
  return generator.generate({ prompt, attempt, model });
});
