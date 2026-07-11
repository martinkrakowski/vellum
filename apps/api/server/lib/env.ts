import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Apply KEY=VALUE lines from a file without overriding vars already set. */
function applyEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

let loaded = false;

/**
 * Load .env.local / .env into process.env (idempotent). Must be **called** — a
 * bare `import` for its side effect gets tree-shaken by Nitro's bundler, which
 * would leave the provider keys unset and silently fall the pipeline back to the
 * procedural floor (no real generation, but looking "fine").
 *
 * Reads from the cwd (Nitro runs in apps/api) and the monorepo root (two up),
 * so the repo-root .env.local is found. First value wins.
 */
export function loadEnv(): void {
  if (loaded) return;
  const roots = new Set([process.cwd(), resolve(process.cwd(), "..", "..")]);
  for (const dir of roots) {
    applyEnvFile(resolve(dir, ".env.local"));
    applyEnvFile(resolve(dir, ".env"));
  }

  // Announce, once, what texture generation will actually do — a keyless run (or
  // a dev server started before keys were added) is then self-evident in the
  // logs instead of silently producing the static floor.
  const providers: string[] = [];
  if (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY) {
    const keyName = process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : "GOOGLE_API_KEY";
    providers.push(`imagen (${keyName})`);
  }
  if (process.env.OPENROUTER_API_KEY) providers.push("openrouter (OPENROUTER_API_KEY)");
  const fireflyId = process.env.FIREFLY_CLIENT_ID;
  const fireflySecret = process.env.FIREFLY_CLIENT_SECRET;
  if (fireflyId && fireflySecret) {
    providers.push("firefly (FIREFLY_CLIENT_ID/SECRET)");
  } else if (fireflyId || fireflySecret) {
    console.warn(
      `[env] Firefly half-configured — ${fireflyId ? "FIREFLY_CLIENT_SECRET" : "FIREFLY_CLIENT_ID"} is missing; the firefly tier will use the fallback chain.`,
    );
  }
  if (providers.length > 0) {
    console.log(`[env] texture generation: ${providers.join(", ")} — procedural floor fallback`);
  } else {
    console.warn(
      "[env] texture generation: procedural floor only — no GenAI keys detected. " +
        "Add FIREFLY_CLIENT_ID + FIREFLY_CLIENT_SECRET, GEMINI_API_KEY, or OPENROUTER_API_KEY to .env.local for real imagery, then restart.",
    );
  }

  loaded = true;
}
