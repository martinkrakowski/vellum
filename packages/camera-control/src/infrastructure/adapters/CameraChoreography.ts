import type CameraControls from "camera-controls";

/**
 * The one camera pose that sells the thesis: close enough to read the
 * label, angled so the shoulder taper catches the eye on first orbit.
 */
export const HERO_VIEW = {
  position: [3.3, 2.5, 4.3] as const,
  target: [0, 1.3, 0] as const,
};

/** Slow azimuth advance (rad/s) while a re-generation is in flight. */
export const REGENERATION_SWEEP_SPEED = 0.35;

/**
 * The non-jarring re-generation sequence from the manifest: user input
 * off, damped tween back to the hero pose (CameraControls' setLookAt with
 * transition — the reason this wraps camera-controls, not OrbitControls).
 * The renderer advances the slow sweep each frame while `regenerating`,
 * and releaseToUser() hands input back after configure() resolves.
 */
export async function tweenToHero(controls: CameraControls): Promise<void> {
  controls.enabled = false;
  await controls.setLookAt(
    HERO_VIEW.position[0],
    HERO_VIEW.position[1],
    HERO_VIEW.position[2],
    HERO_VIEW.target[0],
    HERO_VIEW.target[1],
    HERO_VIEW.target[2],
    true,
  );
}

export function advanceSweep(controls: CameraControls, delta: number): void {
  controls.azimuthAngle += REGENERATION_SWEEP_SPEED * delta;
}

export function releaseToUser(controls: CameraControls): void {
  controls.enabled = true;
}
