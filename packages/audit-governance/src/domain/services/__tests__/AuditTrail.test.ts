import type { SceneConfig, SceneIteration } from "@vellum/scene-types";
import { AuditTrailSchema, IDENTITY_TRANSFORM } from "@vellum/scene-types";
import { describe, expect, it } from "vitest";

import { buildAuditTrail } from "../AuditTrail.js";

const config: SceneConfig = {
  attempt: 1,
  prompt: "botanical tonic label",
  textureUrl: "/assets/textures/label-attempt-1.png",
  textureTransform: IDENTITY_TRANSFORM,
  modelUrl: null,
};

const rejected: SceneIteration = {
  attempt: 1,
  config,
  status: "REJECTED",
  feedback: {
    category: "UV_DISTORTION",
    note: "grid smears at the shoulder",
    createdAt: "2026-07-06T12:01:00.000Z",
  },
  distortionWarning: true,
  startedAt: "2026-07-06T12:00:00.000Z",
  resolvedAt: "2026-07-06T12:01:00.000Z",
};

const approved: SceneIteration = {
  ...rejected,
  attempt: 2,
  config: { ...config, attempt: 2 },
  status: "APPROVED",
  feedback: null,
  distortionWarning: false,
  resolvedAt: "2026-07-06T12:03:00.000Z",
};

describe("buildAuditTrail", () => {
  const trail = buildAuditTrail({
    sessionId: "session-1",
    prompt: config.prompt,
    iterations: [rejected, approved],
    outcome: "APPROVED",
    exportedAt: "2026-07-06T12:04:00.000Z",
  });

  it("produces a schema-valid governance artifact", () => {
    expect(AuditTrailSchema.safeParse(trail).success).toBe(true);
  });

  it("stamps the active brand guidelines version", () => {
    expect(trail.brandGuidelinesVersion).toMatch(/^aurora-brand-/);
  });

  it("summarises each decision with category and rationale", () => {
    expect(trail.decisionSummary).toContain("Attempt 1: rejected (UV_DISTORTION)");
    expect(trail.decisionSummary).toContain("grid smears at the shoulder");
    expect(trail.decisionSummary).toContain("Attempt 2: approved");
    expect(trail.decisionSummary).toContain("human approval");
  });

  it("records the distortion warning in the narrative", () => {
    expect(trail.decisionSummary).toContain("distortion warning");
  });
});
