/** Per-request network deadline for a provider generation call (ms). */
export const GENERATION_TIMEOUT_MS = 45_000;
/** Shorter deadline for auth grants and asset downloads (ms). */
export const SHORT_TIMEOUT_MS = 15_000;

/**
 * A trimmed env value, or undefined when unset **or blank**. Lets `a ?? b`
 * alias resolution fall through an empty string (e.g. `.env.example` ships
 * `GEMINI_API_KEY=`), so a blank primary never masks a valid alias.
 */
export function envValue(name: string): string | undefined {
  const raw = process.env[name];
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * An abort signal that fires after `ms` — a hard deadline for a request. Passed
 * to `fetch` (Firefly, OpenRouter) and to the @google/genai config
 * (`abortSignal`), so a stalled request is actually cancelled and fails fast
 * into the fallback chain rather than hanging indefinitely.
 */
export function deadline(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}
