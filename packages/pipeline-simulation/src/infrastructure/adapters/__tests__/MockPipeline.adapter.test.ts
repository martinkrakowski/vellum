import type { PipelineEvent, SceneConfig } from "@vellum/scene-types";
import { IDENTITY_TRANSFORM, PIPELINE_STEP_ORDER } from "@vellum/scene-types";
import { MockTextureAdapter } from "@vellum/texture-generation";
import { describe, expect, it } from "vitest";

import {
  MockPipelineAdapter,
  STEP_DELAYS_MS,
} from "../MockPipeline.adapter.js";

const instantSleep = async () => {};

function pipeline() {
  return new MockPipelineAdapter(new MockTextureAdapter(), instantSleep);
}

describe("MockPipelineAdapter", () => {
  it("emits started/completed for all four steps, in order, from the chain", async () => {
    const events: PipelineEvent[] = [];
    await pipeline().run(
      { prompt: "p", attempt: 1, previous: null, category: null },
      (e) => events.push(e),
    );
    expect(events).toEqual(
      PIPELINE_STEP_ORDER.flatMap((stepId) => [
        { stepId, status: "started" },
        { stepId, status: "completed" },
      ]),
    );
  });

  it("narration budget: calibrated delays total 5.3s", () => {
    const total = Object.values(STEP_DELAYS_MS).reduce((a, b) => a + b, 0);
    expect(total).toBe(5300);
  });

  it("attempt 1 produces the identity-transform base config", async () => {
    const config = await pipeline().run(
      { prompt: "p", attempt: 1, previous: null, category: null },
      () => {},
    );
    expect(config.attempt).toBe(1);
    expect(config.textureTransform).toEqual(IDENTITY_TRANSFORM);
    expect(config.textureUrl).toContain("label-attempt-1");
  });

  it("UV_DISTORTION rejection applies the corrective transform on attempt 2", async () => {
    const previous: SceneConfig = {
      attempt: 1,
      prompt: "p",
      textureUrl: "/assets/textures/label-attempt-1.png",
      textureTransform: IDENTITY_TRANSFORM,
      modelUrl: null,
    };
    const config = await pipeline().run(
      { prompt: "p", attempt: 2, previous, category: "UV_DISTORTION" },
      () => {},
    );
    expect(config.textureTransform.repeatX).toBe(1.35);
    expect(config.textureUrl).toContain("label-attempt-2");
  });

  it("OTHER rejection re-runs the texture with the transform untouched", async () => {
    const previous: SceneConfig = {
      attempt: 1,
      prompt: "p",
      textureUrl: "/assets/textures/label-attempt-1.png",
      textureTransform: IDENTITY_TRANSFORM,
      modelUrl: null,
    };
    const config = await pipeline().run(
      { prompt: "p", attempt: 2, previous, category: "OTHER" },
      () => {},
    );
    expect(config.textureTransform).toEqual(IDENTITY_TRANSFORM);
    expect(config.textureUrl).toContain("label-attempt-2");
  });

  it("refuses a retry without the rejected config", async () => {
    await expect(
      pipeline().run(
        { prompt: "p", attempt: 2, previous: null, category: null },
        () => {},
      ),
    ).rejects.toThrow(/requires the rejected config/);
  });
});
