import type { SceneConfig } from "@vellum/scene-types";
import { IDENTITY_TRANSFORM } from "@vellum/scene-types";
import { describe, expect, it } from "vitest";

import type { GeometrySample } from "../../../domain/services/StretchRatio.js";
import { GeometryDistortionAdapter } from "../GeometryDistortion.adapter.js";

/** Strip whose bevel smears a 0.2 UV band across 0.32 of world — ratio 1.6. */
function distortedSample(): GeometrySample {
  const positions = [
    0, 0, 0, 1, 0, 0, 1, 0.8, 0, 0, 0.8, 0,
    0, 0.8, 0, 1, 0.8, 0, 1, 1.12, 0, 0, 1.12, 0,
  ];
  const uvs = [0, 0, 1, 0, 1, 0.8, 0, 0.8, 0, 0.8, 1, 0.8, 1, 1, 0, 1];
  const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
  return { positions, uvs, indices, bevelSplitV: 0.8 };
}

const config = (repeatX: number): SceneConfig => ({
  attempt: repeatX === 1 ? 1 : 2,
  prompt: "p",
  textureUrl: "/assets/textures/label-attempt-1.png",
  textureTransform: { ...IDENTITY_TRANSFORM, repeatX },
  modelUrl: null,
});

describe("GeometryDistortionAdapter", () => {
  it("warns on the identity transform — the raw mapping smears the bevel", async () => {
    const adapter = new GeometryDistortionAdapter(distortedSample);
    const report = await adapter.evaluate(config(1));
    expect(report.stretchRatio).toBeCloseTo(1.6, 5);
    expect(report.distortionWarning).toBe(true);
  });

  it("the UV_DISTORTION correction clears the warning", async () => {
    const adapter = new GeometryDistortionAdapter(distortedSample);
    const report = await adapter.evaluate(config(1.35));
    expect(report.stretchRatio).toBeCloseTo(1.6 / 1.35, 5);
    expect(report.distortionWarning).toBe(false);
  });

  it("reports quietly when no geometry has been rendered yet", async () => {
    const adapter = new GeometryDistortionAdapter(() => null);
    const report = await adapter.evaluate(config(1));
    expect(report).toEqual({
      stretchRatio: 1,
      threshold: 1.3,
      distortionWarning: false,
    });
  });
});
