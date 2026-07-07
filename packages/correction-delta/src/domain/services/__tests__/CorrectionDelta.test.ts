import type { SceneConfig } from "@vellum/scene-types";
import { IDENTITY_TRANSFORM } from "@vellum/scene-types";
import { describe, expect, it } from "vitest";

import { applyCorrectionDelta, CATEGORY_CORRECTIONS } from "../CorrectionDelta.js";

const previous: SceneConfig = {
  attempt: 1,
  prompt: "botanical tonic label, art-deco, cream and sky blue",
  textureUrl: "/assets/textures/label-attempt-1.png",
  textureTransform: IDENTITY_TRANSFORM,
  modelUrl: null,
};

const NEXT_URL = "/assets/textures/label-attempt-2.png";

describe("applyCorrectionDelta", () => {
  it("UV_DISTORTION produces an observable transform change", () => {
    const next = applyCorrectionDelta(previous, "UV_DISTORTION", NEXT_URL);
    expect(next.textureTransform).not.toEqual(previous.textureTransform);
    expect(next.textureTransform.repeatX).toBe(1.35);
    expect(next.textureTransform.offsetX).toBe(-0.175);
  });

  it("OTHER re-runs with the transform untouched", () => {
    const next = applyCorrectionDelta(previous, "OTHER", NEXT_URL);
    expect(next.textureTransform).toEqual(previous.textureTransform);
    expect(next.textureUrl).toBe(NEXT_URL);
  });

  it("increments the attempt and swaps the texture URL", () => {
    const next = applyCorrectionDelta(previous, "UV_DISTORTION", NEXT_URL);
    expect(next.attempt).toBe(2);
    expect(next.textureUrl).toBe(NEXT_URL);
  });

  it("is deterministic for identical inputs", () => {
    const a = applyCorrectionDelta(previous, "UV_DISTORTION", NEXT_URL);
    const b = applyCorrectionDelta(previous, "UV_DISTORTION", NEXT_URL);
    expect(a).toEqual(b);
  });

  it("never mutates the previous config", () => {
    const frozen = structuredClone(previous);
    applyCorrectionDelta(previous, "UV_DISTORTION", NEXT_URL);
    expect(previous).toEqual(frozen);
  });

  it("every category declares a correction entry", () => {
    expect(Object.keys(CATEGORY_CORRECTIONS).sort()).toEqual([
      "OTHER",
      "UV_DISTORTION",
    ]);
  });
});
