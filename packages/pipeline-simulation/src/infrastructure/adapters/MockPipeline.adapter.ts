import { applyCorrectionDelta } from "@vellum/correction-delta";
import type {
  GenerationRequest,
  PipelinePort,
} from "@vellum/scene-orchestration";
import type { PipelineEvent, SceneConfig } from "@vellum/scene-types";
import { IDENTITY_TRANSFORM, PIPELINE_STEP_ORDER } from "@vellum/scene-types";
import type { TextureGenerationPort } from "@vellum/texture-generation";

type Sleep = (ms: number) => Promise<void>;

const realSleep: Sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Step delays calibrated to the pitch-script narration (~5.3s total).
 * Order must match PIPELINE_STEP_ORDER.
 */
export const STEP_DELAYS_MS: Record<(typeof PIPELINE_STEP_ORDER)[number], number> =
  {
    PROMPT_ANALYSIS: 800,
    TEXTURE_GENERATION: 2600,
    SCENE_ASSEMBLY: 1100,
    DISTORTION_SCAN: 800,
  };

/**
 * Deterministic mocked pipeline. Every step event is emitted from inside
 * this promise chain — never from a detached timeout — so the stepper UI
 * cannot desync from actual scene state. Sleep is injectable so tests run
 * at zero wall-clock.
 */
export class MockPipelineAdapter implements PipelinePort {
  constructor(
    private readonly textures: TextureGenerationPort,
    private readonly sleep: Sleep = realSleep,
  ) {}

  async run(
    request: GenerationRequest,
    onEvent: (event: PipelineEvent) => void,
  ): Promise<SceneConfig> {
    for (const stepId of PIPELINE_STEP_ORDER) {
      onEvent({ stepId, status: "started" });
      await this.sleep(STEP_DELAYS_MS[stepId]);
      onEvent({ stepId, status: "completed" });
    }
    return this.resolveConfig(request);
  }

  private resolveConfig(request: GenerationRequest): SceneConfig {
    if (request.attempt === 1) {
      return {
        attempt: 1,
        prompt: request.prompt,
        textureUrl: this.textures.textureUrlFor(1),
        textureTransform: IDENTITY_TRANSFORM,
        modelUrl: null,
      };
    }
    if (!request.previous || !request.category) {
      throw new Error(
        `attempt ${request.attempt} requires the rejected config and its category`,
      );
    }
    return applyCorrectionDelta(
      request.previous,
      request.category,
      this.textures.textureUrlFor(request.attempt),
    );
  }
}
