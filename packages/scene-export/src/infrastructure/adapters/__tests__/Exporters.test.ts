import type { AuditTrail } from "@vellum/scene-types";
import { AuditTrailSchema, IDENTITY_TRANSFORM } from "@vellum/scene-types";
import { describe, expect, it } from "vitest";

import { exportAuditTrailJson } from "../Exporters.js";

const trail: AuditTrail = {
  sessionId: "session-1",
  prompt: "botanical tonic label",
  brandGuidelinesVersion: "aurora-brand-v1.2",
  iterations: [
    {
      attempt: 1,
      config: {
        attempt: 1,
        prompt: "botanical tonic label",
        textureUrl: "/assets/textures/label-attempt-1.png",
        textureTransform: IDENTITY_TRANSFORM,
        modelUrl: null,
      },
      status: "APPROVED",
      feedback: null,
      distortionWarning: false,
      startedAt: "2026-07-06T12:00:00.000Z",
      resolvedAt: "2026-07-06T12:01:00.000Z",
    },
  ],
  outcome: "APPROVED",
  decisionSummary: "Attempt 1: approved by reviewer.",
  exportedAt: "2026-07-06T12:02:00.000Z",
};

describe("exportAuditTrailJson", () => {
  it("round-trips a schema-valid document", async () => {
    const blob = exportAuditTrailJson(trail);
    const parsed: unknown = JSON.parse(await blob.text());
    expect(AuditTrailSchema.safeParse(parsed).success).toBe(true);
    expect(parsed).toEqual(trail);
  });

  it("is human-readable (pretty-printed) — it is a governance document", async () => {
    const text = await exportAuditTrailJson(trail).text();
    expect(text).toContain("\n  ");
  });
});
