"use client";

import type { ThreeJsSceneAdapter } from "@vellum/scene-port";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/**
 * Zero-render child of Canvas. Its whole job is the initialize(refs)
 * handshake: R3F owns the scene/renderer/camera, and calling useThree()
 * from inside the Canvas boundary is the only safe way to hand those
 * refs to the adapter living outside the React tree.
 */
export function SceneInitializer({
  adapter,
}: {
  adapter: ThreeJsSceneAdapter;
}) {
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    adapter.initialize({ scene, renderer: gl, camera });
  }, [adapter, scene, gl, camera]);

  return null;
}
