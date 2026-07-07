import type {
  FeedbackCategory,
  PipelineEvent,
  SceneConfig,
} from "@vellum/scene-types";

/** Everything the pipeline needs to produce the next attempt's config. */
export interface GenerationRequest {
  prompt: string;
  /** 1-based attempt number the pipeline is producing. */
  attempt: number;
  /** Config of the rejected attempt, or null on the first run. */
  previous: SceneConfig | null;
  /** Rejection category driving the correction, or null on the first run. */
  category: FeedbackCategory | null;
}

/**
 * The generation pipeline seam. Step events must be emitted from inside
 * the returned promise's own chain — never detached timers — so the
 * stepper UI cannot desync from scene state.
 */
export interface PipelinePort {
  run(
    request: GenerationRequest,
    onEvent: (event: PipelineEvent) => void,
  ): Promise<SceneConfig>;
}
