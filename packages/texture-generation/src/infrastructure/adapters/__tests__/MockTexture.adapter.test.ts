import { describe, expect, it } from "vitest";

import { MockTextureAdapter } from "../MockTexture.adapter.js";

describe("MockTextureAdapter", () => {
  const textures = new MockTextureAdapter();

  it("returns attempt-keyed URLs — no TextureLoader cache collisions", () => {
    expect(textures.textureUrlFor(1)).toBe(
      "/assets/textures/label-attempt-1.png",
    );
    expect(textures.textureUrlFor(2)).toBe(
      "/assets/textures/label-attempt-2.png",
    );
    expect(textures.textureUrlFor(1)).not.toBe(textures.textureUrlFor(2));
  });

  it("clamps beyond the shipped assets to the corrected texture", () => {
    expect(textures.textureUrlFor(3)).toBe(
      "/assets/textures/label-attempt-2.png",
    );
  });
});
