import { z } from "zod";

/**
 * The four mocked pipeline steps. Events are emitted from inside the
 * pipeline's promise chain — never from detached timeouts — so the stepper
 * UI cannot desync from actual scene state.
 */
export const PipelineStepIdSchema = z.enum([
  "PROMPT_ANALYSIS",
  "TEXTURE_GENERATION",
  "SCENE_ASSEMBLY",
  "DISTORTION_SCAN",
]);

export type PipelineStepId = z.infer<typeof PipelineStepIdSchema>;

export const PIPELINE_STEP_ORDER: readonly PipelineStepId[] =
  PipelineStepIdSchema.options;

export const PipelineEventSchema = z.object({
  stepId: PipelineStepIdSchema,
  status: z.enum(["started", "completed"]),
});

export type PipelineEvent = z.infer<typeof PipelineEventSchema>;
