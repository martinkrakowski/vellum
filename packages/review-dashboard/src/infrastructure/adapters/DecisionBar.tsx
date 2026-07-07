"use client";

import type { ReviewState } from "@vellum/scene-orchestration";

/**
 * The HITL commitment point. Approve/Reject only exist in `reviewing`;
 * exports only exist in `approved` (the terminal state the governance
 * artifact belongs to); maxRetriesReached offers the explicit restart.
 */
export function DecisionBar({
  state,
  onApprove,
  onRejectIntent,
  onExportJson,
  onExportGlb,
  onReset,
}: {
  state: ReviewState;
  onApprove: () => void;
  onRejectIntent: () => void;
  onExportJson: () => void;
  onExportGlb: () => void;
  onReset: () => void;
}) {
  if (state === "reviewing") {
    return (
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onRejectIntent}
          className="rounded-md border border-error px-5 py-2.5 text-sm font-medium text-error hover:bg-error/10"
        >
          Reject…
        </button>
        <button
          type="button"
          onClick={onApprove}
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary-hover"
        >
          Approve
        </button>
      </div>
    );
  }

  if (state === "approved") {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-success">
          <span aria-hidden className="h-2 w-2 rounded-full bg-success" />
          Approved — export the governance artifact
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={onExportJson}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover"
          >
            Export audit trail (JSON)
          </button>
          <button
            type="button"
            onClick={onExportGlb}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface"
          >
            Export GLB
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface"
          >
            New session
          </button>
        </span>
      </div>
    );
  }

  if (state === "maxRetriesReached") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3">
        <span className="text-sm text-text-primary">
          Retry budget exhausted — three structured rejections are a signal
          the prompt, not the transform, needs to change.
        </span>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover"
        >
          Start new session
        </button>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover"
        >
          Reset session
        </button>
      </div>
    );
  }

  return null;
}
