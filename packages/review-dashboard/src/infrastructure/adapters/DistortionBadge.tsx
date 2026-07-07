"use client";

import type { DistortionReport } from "@vellum/scene-types";

/**
 * The guardrail the manifest promises: a quiet amber cue in the 3D pane
 * that fires from the heuristic before the human orbits to the problem
 * angle. Renders nothing until a report exists; renders a calm all-clear
 * once the correction lands.
 */
export function DistortionBadge({
  report,
}: {
  report: DistortionReport | null;
}) {
  if (!report) return null;
  return report.distortionWarning ? (
    <div
      role="status"
      className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning backdrop-blur"
    >
      <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-warning" />
      UV stretch {report.stretchRatio.toFixed(2)}× (threshold{" "}
      {report.threshold.toFixed(1)}×) — orbit to the shoulder
    </div>
  ) : (
    <div
      role="status"
      className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-success/40 bg-success/15 px-3 py-1.5 text-xs font-medium text-success backdrop-blur"
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-success" />
      UV density within tolerance ({report.stretchRatio.toFixed(2)}×)
    </div>
  );
}
