import type { SceneConfig } from "@vellum/scene-types";

/**
 * The seam between orchestration and the renderer. The state machine only
 * ever speaks SceneConfig through this port — it never imports Three.js or
 * React. ThreeJsSceneAdapter (scene-port package) is the production
 * implementation; MockSceneAdapter (pipeline-simulation) serves tests.
 *
 * configure() is two-phase inside the adapter (first call loads the model,
 * later calls swap texture + transform) — the machine never distinguishes
 * first-load from re-run.
 */
export interface ScenePort {
  configure(config: SceneConfig): Promise<void>;
}
