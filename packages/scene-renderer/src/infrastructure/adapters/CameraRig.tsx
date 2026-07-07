"use client";

import {
  advanceSweep,
  HERO_VIEW,
  releaseToUser,
  tweenToHero,
} from "@vellum/camera-control";
import { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type CameraControlsImpl from "camera-controls";

/**
 * Orbit via CameraControls (damped, tween-capable — the reason it beats
 * OrbitControls here). While a re-generation is in flight: input off,
 * tween home to the hero pose, slow sweep; input returns when the new
 * attempt is on the mesh.
 */
export function CameraRig({ regenerating }: { regenerating: boolean }) {
  const controlsRef = useRef<CameraControlsImpl | null>(null);

  useEffect(() => {
    // initial pose, instant — the tween variant is reserved for re-runs
    controlsRef.current?.setLookAt(
      HERO_VIEW.position[0],
      HERO_VIEW.position[1],
      HERO_VIEW.position[2],
      HERO_VIEW.target[0],
      HERO_VIEW.target[1],
      HERO_VIEW.target[2],
      false,
    );
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (regenerating) {
      void tweenToHero(controls);
    } else {
      releaseToUser(controls);
    }
  }, [regenerating]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (controls && regenerating) advanceSweep(controls, delta);
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={2}
      maxDistance={9}
      maxPolarAngle={Math.PI * 0.55}
      smoothTime={0.4}
    />
  );
}
