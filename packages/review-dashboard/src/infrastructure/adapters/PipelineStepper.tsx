"use client";

import type { PipelineProgress } from "@vellum/scene-orchestration";
import { PIPELINE_STEP_ORDER, type PipelineStepId } from "@vellum/scene-types";

const STEP_LABELS: Record<PipelineStepId, string> = {
  PROMPT_ANALYSIS: "Prompt analysis",
  TEXTURE_GENERATION: "Texture generation",
  SCENE_ASSEMBLY: "Scene assembly",
  DISTORTION_SCAN: "Distortion scan",
};

/**
 * Driven exclusively by machine-context progress, which is fed from
 * inside the pipeline's promise chain — this stepper cannot desync from
 * actual scene state.
 */
export function PipelineStepper({ progress }: { progress: PipelineProgress }) {
  return (
    <ol
      aria-label="Generation pipeline"
      className="flex items-center gap-2 rounded-lg border border-border bg-surface/90 px-4 py-3 backdrop-blur"
    >
      {PIPELINE_STEP_ORDER.map((stepId, index) => {
        const done = progress.completed.includes(stepId);
        const current = progress.currentStep === stepId;
        return (
          <li key={stepId} className="flex items-center gap-2">
            {index > 0 && (
              <span
                aria-hidden
                className={`h-px w-6 ${done || current ? "bg-brand" : "bg-border"}`}
              />
            )}
            <span
              className={`flex items-center gap-1.5 text-xs font-medium ${
                current
                  ? "text-brand"
                  : done
                    ? "text-text-primary"
                    : "text-text-secondary"
              }`}
            >
              <span
                aria-hidden
                className={`inline-block h-2 w-2 rounded-full ${
                  current
                    ? "animate-pulse bg-brand"
                    : done
                      ? "bg-brand"
                      : "bg-border"
                }`}
              />
              {STEP_LABELS[stepId]}
              {current && <span className="sr-only">(in progress)</span>}
              {done && <span className="sr-only">(complete)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
