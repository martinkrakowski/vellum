import type {
  DistortionReport,
  FeedbackPayload,
  PipelineEvent,
  PipelineStepId,
  SceneConfig,
  SceneIteration,
} from "@vellum/scene-types";
import {
  buildIteration,
  resolveIteration,
  withDistortionWarning,
} from "@vellum/review-lifecycle";

/**
 * The review lifecycle as a pure reducer — the architectural seam of the
 * whole system. Zero framework dependency: no React, no Three.js, no
 * timers, no clock. Every user action and pipeline effect arrives as an
 * event; illegal transitions return the context unchanged.
 */
export type ReviewState =
  | "idle"
  | "generating"
  | "reviewing"
  | "regenerating"
  | "approved"
  | "maxRetriesReached"
  | "failed";

export interface PipelineProgress {
  currentStep: PipelineStepId | null;
  completed: PipelineStepId[];
}

export interface MachineContext {
  sessionId: string;
  state: ReviewState;
  prompt: string | null;
  maxAttempts: number;
  /** Append-only ledger — becomes the AuditTrail on export. */
  iterations: SceneIteration[];
  pipeline: PipelineProgress;
  /** Report for the active (last) iteration, once evaluated. */
  distortion: DistortionReport | null;
  error: string | null;
}

export type MachineEvent =
  | { type: "PROMPT_SUBMITTED"; prompt: string }
  | { type: "PIPELINE_STEP"; event: PipelineEvent }
  | { type: "GENERATION_SUCCEEDED"; config: SceneConfig; startedAt: string }
  | { type: "DISTORTION_EVALUATED"; report: DistortionReport }
  | { type: "GENERATION_FAILED"; message: string }
  | { type: "APPROVED"; at: string }
  | { type: "REJECTED"; feedback: FeedbackPayload; at: string }
  | { type: "SESSION_RESET"; sessionId: string };

export const MAX_ATTEMPTS = 3;

const IDLE_PIPELINE: PipelineProgress = { currentStep: null, completed: [] };

export function initialContext(sessionId: string): MachineContext {
  return {
    sessionId,
    state: "idle",
    prompt: null,
    maxAttempts: MAX_ATTEMPTS,
    iterations: [],
    pipeline: IDLE_PIPELINE,
    distortion: null,
    error: null,
  };
}

export function reviewReducer(
  context: MachineContext,
  event: MachineEvent,
): MachineContext {
  switch (event.type) {
    case "PROMPT_SUBMITTED":
      if (context.state !== "idle") return context;
      return {
        ...context,
        state: "generating",
        prompt: event.prompt,
        pipeline: IDLE_PIPELINE,
        error: null,
      };

    case "PIPELINE_STEP": {
      if (context.state !== "generating" && context.state !== "regenerating")
        return context;
      const { stepId, status } = event.event;
      return {
        ...context,
        pipeline:
          status === "started"
            ? { ...context.pipeline, currentStep: stepId }
            : {
                currentStep: null,
                completed: [...context.pipeline.completed, stepId],
              },
      };
    }

    case "GENERATION_SUCCEEDED":
      if (context.state !== "generating" && context.state !== "regenerating")
        return context;
      return {
        ...context,
        state: "reviewing",
        iterations: [
          ...context.iterations,
          buildIteration(event.config, event.startedAt),
        ],
        distortion: null,
      };

    case "DISTORTION_EVALUATED": {
      if (context.state !== "reviewing") return context;
      const active = context.iterations.at(-1);
      if (!active) return context;
      return {
        ...context,
        distortion: event.report,
        iterations: [
          ...context.iterations.slice(0, -1),
          withDistortionWarning(active, event.report.distortionWarning),
        ],
      };
    }

    case "GENERATION_FAILED":
      if (context.state !== "generating" && context.state !== "regenerating")
        return context;
      return { ...context, state: "failed", error: event.message };

    case "APPROVED": {
      if (context.state !== "reviewing") return context;
      const active = context.iterations.at(-1);
      if (!active) return context;
      return {
        ...context,
        state: "approved",
        iterations: [
          ...context.iterations.slice(0, -1),
          resolveIteration(active, "APPROVED", null, event.at),
        ],
      };
    }

    case "REJECTED": {
      if (context.state !== "reviewing") return context;
      const active = context.iterations.at(-1);
      if (!active) return context;
      const iterations = [
        ...context.iterations.slice(0, -1),
        resolveIteration(active, "REJECTED", event.feedback, event.at),
      ];
      const exhausted = iterations.length >= context.maxAttempts;
      return {
        ...context,
        state: exhausted ? "maxRetriesReached" : "regenerating",
        iterations,
        pipeline: IDLE_PIPELINE,
        distortion: null,
      };
    }

    case "SESSION_RESET":
      return initialContext(event.sessionId);
  }
}

/** The rejected attempt a regeneration corrects from, if any. */
export function lastRejected(context: MachineContext): SceneIteration | null {
  return (
    [...context.iterations]
      .reverse()
      .find((iteration) => iteration.status === "REJECTED") ?? null
  );
}
