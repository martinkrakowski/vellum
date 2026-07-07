import type { PipelineEvent, SceneConfig } from "@vellum/scene-types";
import { IDENTITY_TRANSFORM } from "@vellum/scene-types";
import { describe, expect, it, vi } from "vitest";

import { runGeneration } from "../RunGeneration.js";
import type { MachineEvent } from "../ReviewMachine.js";

const config: SceneConfig = {
  attempt: 1,
  prompt: "p",
  textureUrl: "/assets/textures/label-attempt-1.png",
  textureTransform: IDENTITY_TRANSFORM,
  modelUrl: null,
};

const report = { stretchRatio: 1.1, threshold: 1.3, distortionWarning: false };

function harness(overrides?: {
  pipelineFails?: boolean;
  configureFails?: boolean;
  distortionFails?: boolean;
}) {
  const dispatched: MachineEvent[] = [];
  const deps = {
    pipeline: {
      run: vi.fn(
        async (_req: unknown, onEvent: (e: PipelineEvent) => void) => {
          onEvent({ stepId: "PROMPT_ANALYSIS", status: "started" });
          onEvent({ stepId: "PROMPT_ANALYSIS", status: "completed" });
          if (overrides?.pipelineFails) throw new Error("pipeline exploded");
          return config;
        },
      ),
    },
    scene: {
      configure: vi.fn(async () => {
        if (overrides?.configureFails) throw new Error("webgl lost");
      }),
    },
    distortion: {
      evaluate: vi.fn(async () => {
        if (overrides?.distortionFails) throw new Error("canvas sample failed");
        return report;
      }),
    },
    dispatch: (event: MachineEvent) => void dispatched.push(event),
    now: () => "2026-07-06T12:00:00.000Z",
  };
  return { deps, dispatched };
}

const request = { prompt: "p", attempt: 1, previous: null, category: null };

describe("runGeneration", () => {
  it("streams step events, configures the scene, then evaluates distortion — in order", async () => {
    const { deps, dispatched } = harness();
    await runGeneration(deps, request);
    expect(dispatched.map((e) => e.type)).toEqual([
      "PIPELINE_STEP",
      "PIPELINE_STEP",
      "GENERATION_SUCCEEDED",
      "DISTORTION_EVALUATED",
    ]);
    // configure resolves before success is announced
    expect(deps.scene.configure).toHaveBeenCalledWith(config);
  });

  it("pipeline failure dispatches GENERATION_FAILED and stops the sequence", async () => {
    const { deps, dispatched } = harness({ pipelineFails: true });
    await runGeneration(deps, request);
    expect(dispatched.at(-1)).toEqual({
      type: "GENERATION_FAILED",
      message: "pipeline exploded",
    });
    expect(deps.scene.configure).not.toHaveBeenCalled();
    expect(deps.distortion.evaluate).not.toHaveBeenCalled();
  });

  it("scene failure after a good pipeline run still fails the generation", async () => {
    const { deps, dispatched } = harness({ configureFails: true });
    await runGeneration(deps, request);
    expect(dispatched.at(-1)).toEqual({
      type: "GENERATION_FAILED",
      message: "webgl lost",
    });
    expect(deps.distortion.evaluate).not.toHaveBeenCalled();
  });

  it("distortion failure after success is a DISTORTION_FAILED, not a dropped GENERATION_FAILED", async () => {
    const { deps, dispatched } = harness({ distortionFails: true });
    await runGeneration(deps, request);
    // success is announced first (the attempt IS reviewable), then the
    // scan failure arrives as its own event the reducer handles in reviewing
    expect(dispatched.map((e) => e.type)).toEqual([
      "PIPELINE_STEP",
      "PIPELINE_STEP",
      "GENERATION_SUCCEEDED",
      "DISTORTION_FAILED",
    ]);
    expect(dispatched.at(-1)).toEqual({
      type: "DISTORTION_FAILED",
      message: "canvas sample failed",
    });
  });
});
