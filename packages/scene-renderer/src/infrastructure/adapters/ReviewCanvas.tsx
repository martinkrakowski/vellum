"use client";

import type { ThreeJsSceneAdapter } from "@vellum/scene-port";
import { HERO_VIEW } from "@vellum/camera-control";
import { ContactShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { CameraRig } from "./CameraRig.js";
import { SceneInitializer } from "./SceneInitializer.js";

/**
 * The 3D review viewport. Consumes ScenePort's adapter only — pipeline
 * and domain logic never enter this tree. Studio lighting is built from
 * plain lights (no HDR environment fetch: the demo must run offline),
 * and the GL buffer is preserved so approval-time screenshots work.
 */
export function ReviewCanvas({
  adapter,
  regenerating,
}: {
  adapter: ThreeJsSceneAdapter;
  regenerating: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [...HERO_VIEW.position], fov: 38 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#10151c"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 7, 4]} intensity={1.6} />
      <directionalLight
        position={[-5, 3, -4]}
        intensity={0.5}
        color="#bcd6ff"
      />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.45}
        scale={7}
        blur={2.2}
        far={2.5}
      />
      <SceneInitializer adapter={adapter} />
      <CameraRig regenerating={regenerating} />
    </Canvas>
  );
}
