import type { SceneConfig } from "@vellum/scene-types";
import { IDENTITY_TRANSFORM } from "@vellum/scene-types";
import { describe, expect, it } from "vitest";

import {
  buildIteration,
  resolveIteration,
  withDistortionWarning,
} from "../Iteration.js";

const config: SceneConfig = {
  attempt: 1,
  prompt: "botanical tonic label",
  textureUrl: "/assets/textures/label-attempt-1.png",
  textureTransform: IDENTITY_TRANSFORM,
  modelUrl: null,
};

const T0 = "2026-07-06T12:00:00.000Z";
const T1 = "2026-07-06T12:01:00.000Z";

describe("buildIteration", () => {
  it("opens PENDING with no feedback and no warning", () => {
    const iteration = buildIteration(config, T0);
    expect(iteration).toEqual({
      attempt: 1,
      config,
      status: "PENDING",
      feedback: null,
      distortionWarning: false,
      startedAt: T0,
      resolvedAt: null,
    });
  });
});

describe("resolveIteration", () => {
  it("closes with a decision and timestamp, without mutating", () => {
    const open = buildIteration(config, T0);
    const closed = resolveIteration(
      open,
      "REJECTED",
      { category: "UV_DISTORTION", note: "bevel smear", createdAt: T1 },
      T1,
    );
    expect(closed.status).toBe("REJECTED");
    expect(closed.resolvedAt).toBe(T1);
    expect(open.status).toBe("PENDING");
  });
});

describe("withDistortionWarning", () => {
  it("flags without mutating the original", () => {
    const open = buildIteration(config, T0);
    const flagged = withDistortionWarning(open, true);
    expect(flagged.distortionWarning).toBe(true);
    expect(open.distortionWarning).toBe(false);
  });
});
