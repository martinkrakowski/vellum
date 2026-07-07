"use client";

import type { SceneIteration } from "@vellum/scene-types";

const STATUS_STYLES: Record<SceneIteration["status"], string> = {
  PENDING: "bg-info/15 text-info border-info/40",
  APPROVED: "bg-success/15 text-success border-success/40",
  REJECTED: "bg-error/15 text-error border-error/40",
};

/** The append-only ledger, humanised — what becomes the AuditTrail. */
export function IterationHistory({
  iterations,
}: {
  iterations: SceneIteration[];
}) {
  if (iterations.length === 0) return null;
  return (
    <aside
      aria-label="Iteration history"
      className="flex w-64 shrink-0 flex-col gap-2 overflow-y-auto"
    >
      <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
        Iterations
      </h2>
      {iterations.map((iteration) => (
        <article
          key={iteration.attempt}
          className="rounded-lg border border-border bg-surface p-3"
        >
          <header className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              Attempt {iteration.attempt}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[iteration.status]}`}
            >
              {iteration.status}
            </span>
          </header>
          <dl className="mt-2 space-y-1 text-xs text-text-secondary">
            <div className="flex justify-between">
              <dt>repeat</dt>
              <dd className="font-mono">
                {iteration.config.textureTransform.repeatX.toFixed(2)} ×{" "}
                {iteration.config.textureTransform.repeatY.toFixed(2)}
              </dd>
            </div>
            {iteration.distortionWarning && (
              <div className="text-warning">distortion warning raised</div>
            )}
            {iteration.feedback && (
              <div>
                <dt className="font-medium text-text-primary">
                  {iteration.feedback.category}
                </dt>
                <dd className="mt-0.5 italic">
                  &ldquo;{iteration.feedback.note}&rdquo;
                </dd>
              </div>
            )}
          </dl>
        </article>
      ))}
    </aside>
  );
}
