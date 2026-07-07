import { describe, expect, it } from "vitest";

import {
  computeStretchRatio,
  evaluateDistortion,
  type GeometrySample,
} from "../StretchRatio.js";

/**
 * Two stacked quads (4 triangles): front face occupies v ∈ [0, 0.8],
 * bevel v ∈ [0.8, 1]. worldBevelHeight controls how much world-space
 * surface the bevel's UV strip is smeared across.
 */
function twoRegionStrip(worldBevelHeight: number): GeometrySample {
  const positions = [
    // front quad, 1 × 0.8 in world
    0, 0, 0, 1, 0, 0, 1, 0.8, 0, 0, 0.8, 0,
    // bevel quad on top, 1 × worldBevelHeight
    0, 0.8, 0, 1, 0.8, 0, 1, 0.8 + worldBevelHeight, 0, 0, 0.8 + worldBevelHeight, 0,
  ];
  const uvs = [
    0, 0, 1, 0, 1, 0.8, 0, 0.8,
    0, 0.8, 1, 0.8, 1, 1, 0, 1,
  ];
  const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
  return { positions, uvs, indices, bevelSplitV: 0.8 };
}

describe("computeStretchRatio", () => {
  it("scores 1.0 for a uniform mapping", () => {
    // bevel world height 0.2 matches its 0.2 UV strip — same density as front
    expect(computeStretchRatio(twoRegionStrip(0.2))).toBeCloseTo(1, 5);
  });

  it("detects the bevel smearing its UV strip across too much surface", () => {
    // 0.2 of UV stretched over 0.4 of world → density halves → ratio 2
    expect(computeStretchRatio(twoRegionStrip(0.4))).toBeCloseTo(2, 5);
  });

  it("is symmetric — compression registers like stretch", () => {
    // 0.2 of UV squeezed into 0.1 of world
    expect(computeStretchRatio(twoRegionStrip(0.1))).toBeCloseTo(2, 5);
  });

  it("scores 1.0 when a region is absent", () => {
    const sample = twoRegionStrip(0.4);
    expect(
      computeStretchRatio({ ...sample, bevelSplitV: 2 }),
    ).toBe(1);
  });
});

describe("evaluateDistortion", () => {
  it("raises the warning above the 1.3 threshold", () => {
    const report = evaluateDistortion(twoRegionStrip(0.4));
    expect(report.distortionWarning).toBe(true);
    expect(report.threshold).toBe(1.3);
  });

  it("stays quiet within tolerance", () => {
    const report = evaluateDistortion(twoRegionStrip(0.22));
    expect(report.distortionWarning).toBe(false);
  });
});
