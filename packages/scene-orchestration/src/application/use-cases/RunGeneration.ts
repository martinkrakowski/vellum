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
  try {
    const config = await deps.pipeline.run(request, (event) =>
      deps.dispatch({ type: "PIPELINE_STEP", event }),
    );
    await deps.scene.configure(config);
    deps.dispatch({ type: "GENERATION_SUCCEEDED", config, startedAt });
    const report = await deps.distortion.evaluate(config);
    deps.dispatch({ type: "DISTORTION_EVALUATED", report });
  } catch (cause) {
    deps.dispatch({
      type: "GENERATION_FAILED",
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
