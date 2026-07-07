import * as THREE from "three";

/**
 * Parametric stand-in for the calibrated GLB (which stays a drop-in swap
 * via SceneConfig.modelUrl). Deliberately mis-mapped: LatheGeometry
 * distributes V by point index, not arc length, so giving the body five
 * segments and the shoulder taper two smears the label's top UV strip
 * across disproportionate world surface — the exact defect the demo
 * exists to reveal. The numbers put the geometric stretch ratio ≈ 1.49:
 * above the 1.3 warning threshold raw, comfortably below it after the
 * 1.35× UV_DISTORTION correction.
 */

const LABEL_RADIUS = 0.915;
const LABEL_BODY_POINTS: Array<[number, number]> = [
  [LABEL_RADIUS, 0.35],
  [LABEL_RADIUS, 0.58],
  [LABEL_RADIUS, 0.81],
  [LABEL_RADIUS, 1.04],
  [LABEL_RADIUS, 1.27],
  [LABEL_RADIUS, 1.5],
];
const LABEL_TAPER_POINTS: Array<[number, number]> = [
  [0.88, 1.66],
  [0.8, 1.8],
];

/** V above this belongs to the shoulder taper (bevel) region. */
export const LABEL_BEVEL_SPLIT_V =
  (LABEL_BODY_POINTS.length - 1) /
  (LABEL_BODY_POINTS.length + LABEL_TAPER_POINTS.length - 1);

const BOTTLE_PROFILE: Array<[number, number]> = [
  [0.001, 0.02],
  [0.5, 0.02],
  [0.82, 0.05],
  [0.905, 0.18],
  [0.905, 1.5],
  [0.86, 1.72],
  [0.7, 1.9],
  [0.42, 2.05],
  [0.3, 2.18],
  [0.28, 2.5],
  [0.32, 2.55],
  [0.32, 2.68],
];

export interface BottleParts {
  group: THREE.Group;
  labelMesh: THREE.Mesh;
  bodyMesh: THREE.Mesh;
}

export function createBottle(): BottleParts {
  const group = new THREE.Group();
  group.name = "Bottle";

  const bodyGeometry = new THREE.LatheGeometry(
    BOTTLE_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
    96,
  );
  const bodyMesh = new THREE.Mesh(
    bodyGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0xcfe0e6,
      roughness: 0.15,
      clearcoat: 0.6,
      transparent: true,
      opacity: 0.6,
    }),
  );
  bodyMesh.name = "BottleBody";

  const capGeometry = new THREE.CylinderGeometry(0.34, 0.34, 0.35, 48);
  const capMesh = new THREE.Mesh(
    capGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x2a2e35,
      metalness: 0.8,
      roughness: 0.3,
    }),
  );
  capMesh.position.y = 2.68 + 0.35 / 2 - 0.05;
  capMesh.name = "BottleCap";

  const labelGeometry = new THREE.LatheGeometry(
    [...LABEL_BODY_POINTS, ...LABEL_TAPER_POINTS].map(
      ([r, y]) => new THREE.Vector2(r, y),
    ),
    96,
  );
  const labelMesh = new THREE.Mesh(
    labelGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide }),
  );
  labelMesh.name = "LabelMesh";

  group.add(bodyMesh, capMesh, labelMesh);
  return { group, labelMesh, bodyMesh };
}

export interface LabelGeometrySample {
  positions: ArrayLike<number>;
  uvs: ArrayLike<number>;
  indices: ArrayLike<number>;
  bevelSplitV: number;
}

/** Raw label mesh data for the distortion heuristic — framework-free shape. */
export function sampleLabelGeometry(mesh: THREE.Mesh): LabelGeometrySample {
  const geometry = mesh.geometry;
  const index = geometry.getIndex();
  if (!index) throw new Error("label geometry must be indexed");
  return {
    positions: geometry.getAttribute("position").array,
    uvs: geometry.getAttribute("uv").array,
    indices: index.array,
    bevelSplitV: LABEL_BEVEL_SPLIT_V,
  };
}
