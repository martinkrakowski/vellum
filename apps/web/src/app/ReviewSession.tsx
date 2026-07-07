"use client";

import { buildAuditTrail } from "@vellum/audit-governance";
import { GeometryDistortionAdapter } from "@vellum/distortion-detection";
import { MockPipelineAdapter } from "@vellum/pipeline-simulation";
import {
  DecisionBar,
  DistortionBadge,
  FeedbackModal,
  IterationHistory,
  PipelineStepper,
} from "@vellum/review-dashboard";
import {
  initialContext,
  reviewReducer,
  runGeneration,
  type RunGenerationDeps,
} from "@vellum/scene-orchestration";
import {
  downloadBlob,
  exportAuditTrailJson,
  exportSceneGlb,
} from "@vellum/scene-export";
import { ThreeJsSceneAdapter } from "@vellum/scene-port";
import { ReviewCanvas } from "@vellum/scene-renderer";
import type { AuditTrail, FeedbackPayload } from "@vellum/scene-types";
import { SplitView } from "@vellum/split-view";
import { MockTextureAdapter } from "@vellum/texture-generation";
import { useMemo, useReducer, useState } from "react";

/**
 * Composition root. Every adapter is bound here and nowhere else —
 * swapping MockTextureAdapter for FireflyTextureAdapter is a one-line
 * change in this file. The reducer owns all governance-relevant state;
 * the only local state is view concerns (prompt draft, modal open).
 */
export function ReviewSession() {
  const [context, dispatch] = useReducer(
    reviewReducer,
    "vellum-demo-session",
    initialContext,
  );
  const [promptDraft, setPromptDraft] = useState(
    "Art-deco botanical tonic label, cream and sky blue, fine linework",
  );
  const [modalOpen, setModalOpen] = useState(false);

  const scene = useMemo(() => new ThreeJsSceneAdapter(), []);
  const deps = useMemo<RunGenerationDeps>(
    () => ({
      pipeline: new MockPipelineAdapter(new MockTextureAdapter()),
      scene,
      distortion: new GeometryDistortionAdapter(() =>
        scene.sampleLabelGeometry(),
      ),
      dispatch,
      now: () => new Date().toISOString(),
    }),
    [scene],
  );

  const activeConfig = context.iterations.at(-1)?.config ?? null;
  const generating =
    context.state === "generating" || context.state === "regenerating";

  const submitPrompt = () => {
    const prompt = promptDraft.trim();
    if (!prompt || context.state !== "idle") return;
    dispatch({ type: "PROMPT_SUBMITTED", prompt });
    void runGeneration(deps, {
      prompt,
      attempt: 1,
      previous: null,
      category: null,
    });
  };

  const reject = (feedback: FeedbackPayload) => {
    setModalOpen(false);
    if (context.state !== "reviewing") return;
    dispatch({ type: "REJECTED", feedback, at: feedback.createdAt });
    const exhausted = context.iterations.length >= context.maxAttempts;
    if (exhausted || !context.prompt || !activeConfig) return;
    void runGeneration(deps, {
      prompt: context.prompt,
      attempt: activeConfig.attempt + 1,
      previous: activeConfig,
      category: feedback.category,
    });
  };

  const approve = () =>
    dispatch({ type: "APPROVED", at: new Date().toISOString() });

  const reset = () =>
    dispatch({
      type: "SESSION_RESET",
      sessionId: `vellum-demo-${context.iterations.length + 1}`,
    });

  const currentTrail = (): AuditTrail | null => {
    if (!context.prompt || context.iterations.length === 0) return null;
    return buildAuditTrail({
      sessionId: context.sessionId,
      prompt: context.prompt,
      iterations: context.iterations,
      outcome:
        context.state === "maxRetriesReached"
          ? "MAX_RETRIES_REACHED"
          : "APPROVED",
      exportedAt: new Date().toISOString(),
    });
  };

  const exportJson = () => {
    const trail = currentTrail();
    if (trail)
      downloadBlob(
        exportAuditTrailJson(trail),
        `${context.sessionId}-audit-trail.json`,
      );
  };

  const exportGlb = async () => {
    const refs = scene.exportRefs();
    if (!refs) return;
    const blob = await exportSceneGlb(refs.scene, refs.renderer);
    downloadBlob(blob, `${context.sessionId}.glb`);
  };

  if (context.state === "idle") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="max-w-xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            Flat AI looks good.{" "}
            <span className="text-brand">Spatial reveals the truth.</span>
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Generate a packaging texture, then review it where it actually
            lives — on curved geometry, under orbit.
          </p>
        </div>
        <form
          className="flex w-full max-w-xl gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitPrompt();
          }}
        >
          <input
            value={promptDraft}
            onChange={(event) => setPromptDraft(event.target.value)}
            aria-label="Texture prompt"
            className="flex-1 rounded-md border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
          />
          <button
            type="submit"
            disabled={!promptDraft.trim()}
            className="rounded-md bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-primary-hover disabled:pointer-events-none disabled:opacity-50"
          >
            Generate
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 gap-4 p-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {generating && (
          <div className="flex justify-center">
            <PipelineStepper progress={context.pipeline} />
          </div>
        )}
        {context.state === "failed" && (
          <div role="alert" className="rounded-md border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            Generation failed: {context.error}
          </div>
        )}
        {context.state === "reviewing" && context.error && (
          // The attempt is still reviewable; the distortion scan just
          // couldn't run, so we say so instead of showing a stale badge.
          <div role="status" className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-primary">
            Distortion scan unavailable ({context.error}) — review the
            geometry manually before approving.
          </div>
        )}
        <div className="min-h-0 flex-1">
          <SplitView
            flat={
              activeConfig ? (
                // The raw pipeline output at full fidelity — a plain <img>
                // keeps it byte-identical to what 2D review would sign off.
                <img
                  src={activeConfig.textureUrl}
                  alt={`AI-generated label texture, attempt ${activeConfig.attempt}`}
                  className="max-h-full max-w-full rounded border border-border object-contain"
                />
              ) : (
                <p className="text-sm text-text-secondary">Generating…</p>
              )
            }
            spatial={
              <>
                <ReviewCanvas adapter={scene} regenerating={generating} />
                <DistortionBadge report={context.distortion} />
              </>
            }
          />
        </div>
        <DecisionBar
          state={context.state}
          onApprove={approve}
          onRejectIntent={() => setModalOpen(true)}
          onExportJson={exportJson}
          onExportGlb={() => void exportGlb()}
          onReset={reset}
        />
      </div>
      <IterationHistory iterations={context.iterations} />
      <FeedbackModal
        open={modalOpen}
        onSubmit={reject}
        onCancel={() => setModalOpen(false)}
      />
    </section>
  );
}
