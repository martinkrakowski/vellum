import type { ScenePort } from "@vellum/scene-orchestration";
import type { SceneConfig } from "@vellum/scene-types";

/**
 * ScenePort test double: records every configure() call so the state
 * machine can be exercised without a live R3F canvas.
 */
export class MockSceneAdapter implements ScenePort {
  readonly configured: SceneConfig[] = [];

  async configure(config: SceneConfig): Promise<void> {
    this.configured.push(config);
  }
}
