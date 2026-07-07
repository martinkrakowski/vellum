import {
  applyTextureTransform,
  createBottle,
  loadLabelTexture,
  sampleLabelGeometry,
  type BottleParts,
  type LabelGeometrySample,
} from "@vellum/asset-loader";
import type { ScenePort } from "@vellum/scene-orchestration";
import type { SceneConfig } from "@vellum/scene-types";
import type * as THREE from "three";

export interface SceneRefs {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
}

interface SceneEvents {
  modelLoaded: void;
  configured: SceneConfig;
}

type Listener<T> = (payload: T) => void;

/**
 * The primary ScenePort implementation. Owns the two-phase configure()
 * internally — first call builds and mounts the model, later calls swap
 * texture + transform — so the state machine never distinguishes
 * first-load from re-run.
 *
 * Lives outside the React tree: SceneInitializer (scene-renderer) calls
 * initialize() from inside the Canvas with the R3F-owned refs, which is
 * the only safe way to hold them from out here. configure() awaits that
 * handshake, so a generation kicked off before the canvas mounts blocks
 * instead of vanishing.
 *
 * The inline emitter below is deliberate: Node's EventEmitter is not
 * available in the browser without a bundler polyfill.
 */
export class ThreeJsSceneAdapter implements ScenePort {
  private refs: SceneRefs | null = null;
  private bottle: BottleParts | null = null;
  private resolveReady!: () => void;
  private readonly ready = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });
  private listeners: { [K in keyof SceneEvents]: Listener<SceneEvents[K]>[] } =
    { modelLoaded: [], configured: [] };

  on<K extends keyof SceneEvents>(
    event: K,
    listener: Listener<SceneEvents[K]>,
  ): () => void {
    this.listeners[event].push(listener);
    return () => {
      this.listeners[event] = this.listeners[event].filter(
        (candidate) => candidate !== listener,
      ) as never;
    };
  }

  private emit<K extends keyof SceneEvents>(event: K, payload: SceneEvents[K]) {
    for (const listener of this.listeners[event]) listener(payload);
  }

  /** Called once by SceneInitializer from inside the Canvas boundary. */
  initialize(refs: SceneRefs): void {
    if (this.refs) return;
    this.refs = refs;
    this.resolveReady();
  }

  async configure(config: SceneConfig): Promise<void> {
    await this.ready;
    const refs = this.refs;
    if (!refs) throw new Error("unreachable: ready resolved without refs");

    if (!this.bottle) {
      // Demo path is the parametric bottle; a calibrated GLB via
      // config.modelUrl is the documented drop-in swap (see AGENTS
      // spec + plan phase 4.1) and would land here.
      this.bottle = createBottle();
      refs.scene.add(this.bottle.group);
      this.emit("modelLoaded", undefined);
    }

    const texture = await loadLabelTexture(config.textureUrl);
    applyTextureTransform(texture, config.textureTransform);

    const material = this.bottle.labelMesh.material as THREE.MeshStandardMaterial;
    material.map?.dispose();
    material.map = texture;
    material.needsUpdate = true;

    this.emit("configured", config);
  }

  /** Injected into GeometryDistortionAdapter at the composition root. */
  sampleLabelGeometry(): LabelGeometrySample | null {
    return this.bottle ? sampleLabelGeometry(this.bottle.labelMesh) : null;
  }

  /** Export needs the live scene + renderer (GLTFExporter, screenshots). */
  exportRefs(): SceneRefs | null {
    return this.refs;
  }
}
