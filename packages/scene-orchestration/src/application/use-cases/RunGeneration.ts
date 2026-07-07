import type { DistortionPort } from "../ports/out/Distortion.out-port.js";
import type {
  GenerationRequest,
  PipelinePort,
} from "../ports/out/Pipeline.out-port.js";
import type { ScenePort } from "../ports/out/Scene.out-port.js";
import type { MachineEvent } from "./ReviewMachine.js";

export interface RunGenerationDeps {
  pipeline: PipelinePort;
  scene: ScenePort;
  distortion: DistortionPort;
  dispatch: (event: MachineEvent) => void;
  /** ISO-8601 clock, injected — the machine never reads time itself. */
  now: () => string;
}

/**
 * The one effectful sequence in the system: run the pipeline (streaming
 * step events into the machine), realise the config on the scene, then
 * evaluate distortion against the applied result. Everything observable
 * happens via dispatch — the caller owns the reducer.
 */
export async function runGeneration(
  deps: RunGenerationDeps,
  request: GenerationRequest,
): Promise<void> {
  const startedAt = deps.now();
  let config;
  try {
    config = await deps.pipeline.run(request, (event) =>
      deps.dispatch({ type: "PIPELINE_STEP", event }),
    );
    await deps.scene.configure(config);
  } catch (cause) {
    // Pipeline or scene realisation failed — nothing is on screen yet, so
    // this is a hard generation failure the machine can still receive.
    deps.dispatch({ type: "GENERATION_FAILED", message: messageOf(cause) });
    return;
  }

  // Only now is the attempt reviewable. Distortion runs in its own scope:
  // by this point GENERATION_SUCCEEDED has already moved the machine to
  // reviewing, so a scan failure cannot be a GENERATION_FAILED (that event
  // is inert in reviewing and would be silently dropped) — it is a
  // DISTORTION_FAILED, which degrades to "no guardrail" without pretending
  // generation failed.
  deps.dispatch({ type: "GENERATION_SUCCEEDED", config, startedAt });
  try {
    const report = await deps.distortion.evaluate(config);
    deps.dispatch({ type: "DISTORTION_EVALUATED", report });
  } catch (cause) {
    deps.dispatch({ type: "DISTORTION_FAILED", message: messageOf(cause) });
  }
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
