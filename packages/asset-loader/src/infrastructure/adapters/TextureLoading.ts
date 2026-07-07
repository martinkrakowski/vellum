import type { TextureTransform } from "@vellum/scene-types";
import * as THREE from "three";

/**
 * Texture loading with the two demo-reliability guarantees the manifest
 * calls out: every URL is cache-busted (?t=now — belt-and-suspenders on
 * top of attempt-keyed filenames) and every texture gets explicit sRGB
 * colorspace so the flat PNG and the applied material read identically.
 */
export function loadLabelTexture(url: string): Promise<THREE.Texture> {
  const busted = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      busted,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 8;
        resolve(texture);
      },
      undefined,
      () => reject(new Error(`failed to load texture: ${url}`)),
    );
  });
}

/** Realise a SceneConfig's transform on a texture's UV matrix. */
export function applyTextureTransform(
  texture: THREE.Texture,
  transform: TextureTransform,
): void {
  texture.repeat.set(transform.repeatX, transform.repeatY);
  texture.offset.set(transform.offsetX, transform.offsetY);
  texture.center.set(0.5, 0.5);
  texture.rotation = transform.rotation;
  texture.needsUpdate = true;
}
