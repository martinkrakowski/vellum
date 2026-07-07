import type {
  DistortionReport,
  FeedbackPayload,
  SceneConfig,
} from "@vellum/scene-types";
import { IDENTITY_TRANSFORM } from "@vellum/scene-types";
import { describe, expect, it } from "vitest";

import {
  initialContext,
  lastRejected,
  reviewReducer,
  type MachineContext,
  type MachineEvent,
} from "../ReviewMachine.js";

const config = (attempt: number): SceneConfig => ({
  attempt,
  prompt: "botanical tonic label",
  textureUrl: `/assets/textures/label-attempt-${attempt}.png`,
  textureTransform: IDENTITY_TRANSFORM,
  modelUrl: null,
});

const feedback: FeedbackPayload = {
  category: "UV_DISTORTION",
  note: "grid smears at the shoulder bevel",
  createdAt: "2026-07-06T12:01:00.000Z",
};

const warningReport: DistortionReport = {
  stretchRatio: 1.62,
  threshold: 1.3,
  distortionWarning: true,
};

const T = "2026-07-06T12:00:00.000Z";

function run(events: MachineEvent[], from?: MachineContext): MachineContext {
  return events.reduce(reviewReducer, from ?? initialContext("session-1"));
}

describe("reviewReducer — happy path", () => {
  it("idle → generating on prompt submission", () => {
    const ctx = run([{ type: "PROMPT_SUBMITTED", prompt: "p" }]);
    expect(ctx.state).toBe("generating");
    expect(ctx.prompt).toBe("p");
  });

  it("tracks pipeline step progress", () => {
    const ctx = run([
      { type: "PROMPT_SUBMITTED", prompt: "p" },
      { type: "PIPELINE_STEP", event: { stepId: "PROMPT_ANALYSIS", status: "started" } },
      { type: "PIPELINE_STEP", event: { stepId: "PROMPT_ANALYSIS", status: "completed" } },
      { type: "PIPELINE_STEP", event: { stepId: "TEXTURE_GENERATION", status: "started" } },
    ]);
    expect(ctx.pipeline.completed).toEqual(["PROMPT_ANALYSIS"]);
    expect(ctx.pipeline.currentStep).toBe("TEXTURE_GENERATION");
  });

  it("generation success opens a PENDING iteration and enters reviewing", () => {
    const ctx = run([
      { type: "PROMPT_SUBMITTED", prompt: "p" },
      { type: "GENERATION_SUCCEEDED", config: config(1), startedAt: T },
    ]);
    expect(ctx.state).toBe("reviewing");
    expect(ctx.iterations).toHaveLength(1);
    expect(ctx.iterations[0]?.status).toBe("PENDING");
  });

  it("distortion evaluation flags the active iteration", () => {
    const ctx = run([
      { type: "PROMPT_SUBMITTED", prompt: "p" },
      { type: "GENERATION_SUCCEEDED", config: config(1), startedAt: T },
      { type: "DISTORTION_EVALUATED", report: warningReport },
    ]);
    expect(ctx.distortion?.stretchRatio).toBe(1.62);
    expect(ctx.iterations[0]?.distortionWarning).toBe(true);
  });

  it("approval resolves the iteration and terminates the session", () => {
    const ctx = run([
      { type: "PROMPT_SUBMITTED", prompt: "p" },
      { type: "GENERATION_SUCCEEDED", config: config(1), startedAt: T },
      { type: "APPROVED", at: T },
    ]);
    expect(ctx.state).toBe("approved");
    expect(ctx.iterations[0]?.status).toBe("APPROVED");
    expect(ctx.iterations[0]?.resolvedAt).toBe(T);
  });
});

describe("reviewReducer — rejection path", () => {
  const reviewing = run([
    { type: "PROMPT_SUBMITTED", prompt: "p" },
    { type: "GENERATION_SUCCEEDED", config: config(1), startedAt: T },
  ]);

  it("rejection records feedback and enters regenerating", () => {
    const ctx = run([{ type: "REJECTED", feedback, at: T }], reviewing);
    expect(ctx.state).toBe("regenerating");
    expect(ctx.iterations[0]?.status).toBe("REJECTED");
    expect(ctx.iterations[0]?.feedback).toEqual(feedback);
    expect(lastRejected(ctx)?.attempt).toBe(1);
  });

  it("a full reject → regenerate → approve cycle keeps the whole ledger", () => {
    const ctx = run(
      [
        { type: "REJECTED", feedback, at: T },
        { type: "GENERATION_SUCCEEDED", config: config(2), startedAt: T },
        { type: "APPROVED", at: T },
      ],
      reviewing,
    );
    expect(ctx.state).toBe("approved");
    expect(ctx.iterations.map((i) => i.status)).toEqual([
      "REJECTED",
      "APPROVED",
    ]);
  });

  it("exhausting the retry budget lands in maxRetriesReached", () => {
    let ctx = reviewing;
    for (let attempt = 2; attempt <= ctx.maxAttempts; attempt++) {
      ctx = run(
        [
          { type: "REJECTED", feedback, at: T },
          { type: "GENERATION_SUCCEEDED", config: config(attempt), startedAt: T },
        ],
        ctx,
      );
    }
    ctx = run([{ type: "REJECTED", feedback, at: T }], ctx);
    expect(ctx.state).toBe("maxRetriesReached");
    expect(ctx.iterations).toHaveLength(ctx.maxAttempts);
  });
});

describe("reviewReducer — illegal transitions are ignored", () => {
  it.each<[string, MachineEvent, MachineContext]>([
    [
      "approve while idle",
      { type: "APPROVED", at: T },
      initialContext("s"),
    ],
    [
      "reject while generating",
      { type: "REJECTED", feedback, at: T },
      run([{ type: "PROMPT_SUBMITTED", prompt: "p" }]),
    ],
    [
      "second prompt mid-session",
      { type: "PROMPT_SUBMITTED", prompt: "again" },
      run([{ type: "PROMPT_SUBMITTED", prompt: "p" }]),
    ],
    [
      "pipeline step while reviewing",
      {
        type: "PIPELINE_STEP",
        event: { stepId: "PROMPT_ANALYSIS", status: "started" },
      },
      run([
        { type: "PROMPT_SUBMITTED", prompt: "p" },
        { type: "GENERATION_SUCCEEDED", config: config(1), startedAt: T },
      ]),
    ],
  ])("%s returns the context unchanged", (_name, event, from) => {
    expect(reviewReducer(from, event)).toBe(from);
  });
});

describe("reviewReducer — failure and reset", () => {
  it("pipeline failure lands in failed with the message", () => {
    const ctx = run([
      { type: "PROMPT_SUBMITTED", prompt: "p" },
      { type: "GENERATION_FAILED", message: "texture service unreachable" },
    ]);
    expect(ctx.state).toBe("failed");
    expect(ctx.error).toBe("texture service unreachable");
  });

  it("reset returns a fresh session from any state", () => {
    const ctx = run([
      { type: "PROMPT_SUBMITTED", prompt: "p" },
      { type: "GENERATION_SUCCEEDED", config: config(1), startedAt: T },
      { type: "SESSION_RESET", sessionId: "session-2" },
    ]);
    expect(ctx).toEqual(initialContext("session-2"));
  });
});
