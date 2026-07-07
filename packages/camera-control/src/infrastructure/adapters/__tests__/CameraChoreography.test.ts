import { describe, expect, it, vi } from "vitest";

import {
  advanceSweep,
  HERO_VIEW,
  releaseToUser,
  REGENERATION_SWEEP_SPEED,
  tweenToHero,
} from "../CameraChoreography.js";

function fakeControls() {
  return {
    enabled: true,
    azimuthAngle: 0,
    setLookAt: vi.fn(async () => {}),
  };
}

describe("camera choreography", () => {
  it("tweenToHero disables input, then tweens (smooth) to the hero pose", async () => {
    const controls = fakeControls();
    await tweenToHero(controls as never);
    expect(controls.enabled).toBe(false);
    expect(controls.setLookAt).toHaveBeenCalledWith(
      ...HERO_VIEW.position,
      ...HERO_VIEW.target,
      true,
    );
  });

  it("advanceSweep rotates azimuth proportionally to frame delta", () => {
    const controls = fakeControls();
    advanceSweep(controls as never, 0.5);
    expect(controls.azimuthAngle).toBeCloseTo(REGENERATION_SWEEP_SPEED * 0.5);
  });

  it("releaseToUser re-enables input after configure resolves", () => {
    const controls = fakeControls();
    controls.enabled = false;
    releaseToUser(controls as never);
    expect(controls.enabled).toBe(true);
  });
});
