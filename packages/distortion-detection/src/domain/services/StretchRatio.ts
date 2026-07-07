import type { DistortionReport } from "@vellum/scene-types";

/**
 * Raw mesh data of the label surface — framework-free so the heuristic is
 * unit-testable in node. bevelSplitV divides the UV space: triangles whose
 * mean V sits above it belong to the shoulder-taper (bevel) region,
 * everything below is the front face.
 */
export interface GeometrySample {
  positions: ArrayLike<number>;
  uvs: ArrayLike<number>;
  indices: ArrayLike<number>;
  bevelSplitV: number;
}

export const DEFAULT_STRETCH_THRESHOLD = 1.3;

/**
 * Texel-density comparison between the bevel region and the front face.
 * Density is UV area per world area, area-weighted per region; a uniform
 * mapping scores 1.0. The ratio is symmetric (max of r and 1/r) so both
 * stretch and compression register. Returns 1 when either region is
 * absent — a single-region label cannot exhibit *relative* distortion.
 */
export function computeStretchRatio(sample: GeometrySample): number {
  let frontWorld = 0;
  let frontUv = 0;
  let bevelWorld = 0;
  let bevelUv = 0;

  const { positions, uvs, indices, bevelSplitV } = sample;

  for (let t = 0; t + 2 < indices.length; t += 3) {
    const [a, b, c] = [indices[t]!, indices[t + 1]!, indices[t + 2]!];
    const world = triangleArea3(positions, a, b, c);
    const uv = triangleArea2(uvs, a, b, c);
    const meanV = (uvs[a * 2 + 1]! + uvs[b * 2 + 1]! + uvs[c * 2 + 1]!) / 3;
    if (meanV > bevelSplitV) {
      bevelWorld += world;
      bevelUv += uv;
    } else {
      frontWorld += world;
      frontUv += uv;
    }
  }

  if (frontWorld === 0 || bevelWorld === 0 || frontUv === 0 || bevelUv === 0)
    return 1;

  const frontDensity = frontUv / frontWorld;
  const bevelDensity = bevelUv / bevelWorld;
  const ratio = frontDensity / bevelDensity;
  return Math.max(ratio, 1 / ratio);
}

export function evaluateDistortion(
  sample: GeometrySample,
  threshold = DEFAULT_STRETCH_THRESHOLD,
): DistortionReport {
  const stretchRatio = computeStretchRatio(sample);
  return {
    stretchRatio,
    threshold,
    distortionWarning: stretchRatio > threshold,
  };
}

function triangleArea3(p: ArrayLike<number>, a: number, b: number, c: number) {
  const ax = p[a * 3]!, ay = p[a * 3 + 1]!, az = p[a * 3 + 2]!;
  const abx = p[b * 3]! - ax, aby = p[b * 3 + 1]! - ay, abz = p[b * 3 + 2]! - az;
  const acx = p[c * 3]! - ax, acy = p[c * 3 + 1]! - ay, acz = p[c * 3 + 2]! - az;
  const cx = aby * acz - abz * acy;
  const cy = abz * acx - abx * acz;
  const cz = abx * acy - aby * acx;
  return Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
}

function triangleArea2(uv: ArrayLike<number>, a: number, b: number, c: number) {
  const ax = uv[a * 2]!, ay = uv[a * 2 + 1]!;
  const abx = uv[b * 2]! - ax, aby = uv[b * 2 + 1]! - ay;
  const acx = uv[c * 2]! - ax, acy = uv[c * 2 + 1]! - ay;
  return Math.abs(abx * acy - aby * acx) / 2;
}
