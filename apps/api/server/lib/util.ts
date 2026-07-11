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

/** An abort signal that fires after `ms` — pass to `fetch` for a hard deadline. */
export function deadline(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

/**
 * Race a promise against a timeout so a provider SDK call that exposes no abort
 * signal (e.g. @google/genai) can still fail fast into the fallback chain
 * instead of hanging the request indefinitely.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
