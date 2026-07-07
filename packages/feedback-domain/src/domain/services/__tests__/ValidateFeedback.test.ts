import { describe, expect, it } from "vitest";

import { KNOWN_CATEGORIES, validateFeedback } from "../ValidateFeedback.js";

const valid = {
  category: "UV_DISTORTION",
  note: "Label grid smears across the shoulder bevel.",
  createdAt: "2026-07-06T12:00:00.000Z",
};

describe("validateFeedback", () => {
  it("accepts a payload with a known category and a note", () => {
    const result = validateFeedback(valid);
    expect(result.success).toBe(true);
  });

  it("rejects an unknown category", () => {
    const result = validateFeedback({ ...valid, category: "TOO_BLUE" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty note — the audit trail needs a rationale", () => {
    const result = validateFeedback({ ...valid, note: "" });
    expect(result.success).toBe(false);
  });

  it("names the offending field in the error", () => {
    const result = validateFeedback({ ...valid, note: "" });
    if (result.success) throw new Error("expected failure");
    expect(result.error).toContain("note");
  });

  it("exposes exactly the two demo categories", () => {
    expect([...KNOWN_CATEGORIES].sort()).toEqual(["OTHER", "UV_DISTORTION"]);
  });
});
