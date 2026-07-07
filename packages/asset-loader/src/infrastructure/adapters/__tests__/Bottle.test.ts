import { describe, expect, it } from "vitest";

import {
  createBottle,
  LABEL_BEVEL_SPLIT_V,
  sampleLabelGeometry,
} from "../Bottle.js";

/** Same maths as distortion-detection's core, kept in sync by its tests. */
function stretchRatio(sample: ReturnType<typeof sampleLabelGeometry>) {
  const { positions: p, uvs, indices, bevelSplitV } = sample;
  let fw = 0, fu = 0, bw = 0, bu = 0;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const [a, b, c] = [indices[t]!, indices[t + 1]!, indices[t + 2]!];
    const ax = p[a * 3]!, ay = p[a * 3 + 1]!, az = p[a * 3 + 2]!;
    const ab = [p[b * 3]! - ax, p[b * 3 + 1]! - ay, p[b * 3 + 2]! - az];
    const ac = [p[c * 3]! - ax, p[c * 3 + 1]! - ay, p[c * 3 + 2]! - az];
    const cr = [
      ab[1]! * ac[2]! - ab[2]! * ac[1]!,
      ab[2]! * ac[0]! - ab[0]! * ac[2]!,
      ab[0]! * ac[1]! - ab[1]! * ac[0]!,
    ];
    const world = Math.hypot(cr[0]!, cr[1]!, cr[2]!) / 2;
    const uv =
      Math.abs(
        (uvs[b * 2]! - uvs[a * 2]!) * (uvs[c * 2 + 1]! - uvs[a * 2 + 1]!) -
          (uvs[b * 2 + 1]! - uvs[a * 2 + 1]!) * (uvs[c * 2]! - uvs[a * 2]!),
      ) / 2;
    const meanV =
      (uvs[a * 2 + 1]! + uvs[b * 2 + 1]! + uvs[c * 2 + 1]!) / 3;
    if (meanV > bevelSplitV) {
      bw += world;
      bu += uv;
    } else {
      fw += world;
      fu += uv;
    }
  }
  const ratio = fu / fw / (bu / bw);
  return Math.max(ratio, 1 / ratio);
}

describe("createBottle — the calibrated demo asset", () => {
  const { group, labelMesh } = createBottle();

  it("exposes the label under the canonical node name", () => {
    expect(labelMesh.name).toBe("LabelMesh");
    expect(group.getObjectByName("LabelMesh")).toBe(labelMesh);
  });

  it("its mis-mapping fires the distortion warning raw…", () => {
    const ratio = stretchRatio(sampleLabelGeometry(labelMesh));
    expect(ratio).toBeGreaterThan(1.3);
  });

  it("…and clears it under the 1.35x UV_DISTORTION correction", () => {
    const ratio = stretchRatio(sampleLabelGeometry(labelMesh));
    expect(ratio / 1.35).toBeLessThan(1.3);
  });

  it("splits body and taper where the profile says it does", () => {
    expect(LABEL_BEVEL_SPLIT_V).toBeCloseTo(5 / 7, 10);
  });
});
