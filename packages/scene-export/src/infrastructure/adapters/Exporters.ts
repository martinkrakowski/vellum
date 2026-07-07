import type { AuditTrail } from "@vellum/scene-types";
import type * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

/**
 * The governance artifact is the JSON — the GLB is supplementary, exactly
 * as the plan's risk register decided: the fallback (AuditTrail + PNG
 * screenshot) is built first and always works; GLTFExporter is the
 * primary binary path with its known texture-embedding caveats handled
 * (initTexture pre-call + one-frame buffer before parse).
 */
export function exportAuditTrailJson(trail: AuditTrail): Blob {
  return new Blob([JSON.stringify(trail, null, 2)], {
    type: "application/json",
  });
}

export async function exportSceneGlb(
  target: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
): Promise<Blob> {
  target.traverse((object) => {
    const material = (object as THREE.Mesh).material as
      | THREE.MeshStandardMaterial
      | undefined;
    if (material?.map) renderer.initTexture(material.map);
  });
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const buffer = await new GLTFExporter().parseAsync(target, { binary: true });
  if (!(buffer instanceof ArrayBuffer))
    throw new Error("GLTFExporter did not produce a binary GLB");
  return new Blob([buffer], { type: "model/gltf-binary" });
}

export function captureCanvasPng(
  renderer: THREE.WebGLRenderer,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    renderer.domElement.toBlob((blob) => resolve(blob), "image/png"),
  );
}

/** Browser download helper — object URL revoked after the click. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
