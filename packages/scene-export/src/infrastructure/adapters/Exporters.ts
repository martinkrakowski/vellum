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
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
): Promise<Blob> {
  scene.traverse((object) => {
    const material = (object as THREE.Mesh).material as
      | THREE.MeshStandardMaterial
      | undefined;
    if (material?.map) renderer.initTexture(material.map);
  });
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const buffer = await new GLTFExporter().parseAsync(scene, { binary: true });
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

/**
 * Browser download helper. The anchor is attached to the document before
 * clicking (Firefox ignores clicks on detached anchors) and the object URL
 * is revoked on the next tick, not synchronously: some browsers start the
 * download asynchronously after the click handler returns, and revoking too
 * early truncates larger blobs like the GLB export.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
