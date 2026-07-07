# Vellum Demo Runbook

**Verified:** 2026-07-06, live in Chrome against `yarn dev` (Next 15, dev mode).
The full loop below was driven end-to-end in a real browser; screenshots and a
recording of the exact run exist (`vellum-demo-loop.gif`).

## Pre-flight (2 minutes, every time)

```bash
yarn install && yarn build && yarn test && yarn lint:arch   # must all be green
yarn dev                                                     # web on :3000
```

Open http://localhost:3000 — you should see the idle hero
("Flat AI looks good. Spatial reveals the truth.") with the prompt pre-filled.

## The 10-minute script

1. **Thesis (30s).** Idle screen. Read the headline. "2D review approves
   textures that fail on real geometry — Vellum puts the human where the
   product actually lives."
2. **Generate (30s).** Click **Generate**. The four-step pipeline stepper
   (prompt analysis → texture generation → scene assembly → distortion scan)
   runs ~5.3s, driven from inside the pipeline promise chain — it cannot
   desync from scene state.
3. **The reveal (2 min).** Split view appears. Left: the flat AURORA label —
   exactly what 2D review would sign off. Right: the same texture on the
   bottle. The amber badge reads **UV stretch 1.49× (threshold 1.3×)** before
   you touch anything — the heuristic caught it first. Now orbit to the
   shoulder: the measurement grid smears across the taper. That defect is
   invisible on the left pane. **This is the whole product in one screen.**
4. **Structured rejection (2 min).** Click **Reject…**. The category is a
   contract, not a label — each option states its consequence. Pick
   **UV distortion**, write what you saw, submit. Camera tweens home and
   sweeps while the pipeline re-runs.
5. **The correction (2 min).** Attempt 2 lands: ledger shows
   **repeat 1.35 × 1.00** against attempt 1's identity transform, the flat
   pane shows the REV 2 texture, and the badge flips green —
   **UV density within tolerance (1.10×)** (1.49 ÷ 1.35). Same geometry,
   corrected mapping: the category produced an observable, measured change.
6. **Approve + governance (2 min).** Click **Approve**, then
   **Export audit trail (JSON)**: an ADR-style decision record — prompt,
   brandGuidelinesVersion, every attempt with transform numbers, the
   reviewer's words, timestamps, outcome. **Export GLB** ships the textured
   bottle (binary glTF v2, ~210 KB). "The audit trail is the artifact an
   enterprise actually needs from HITL review."
7. **Architecture close (1 min).** Open
   `packages/scene-orchestration/src/application/use-cases/ReviewMachine.ts`:
   a pure reducer, no React, no Three.js — the seam that makes the renderer,
   the mock pipeline, and a future Firefly adapter swappable.
   `yarn lint:arch` enforces the boundaries in CI.

## Verified behaviour (what the dry-run proved)

| Check | Result |
| --- | --- |
| Idle → generating → reviewing, stepper in sync | ✅ |
| Amber badge on attempt 1 | ✅ 1.49× vs 1.3 threshold |
| UV_DISTORTION → transform correction visible in ledger + on mesh | ✅ 1.35 × 1.00 |
| Badge clears on attempt 2 | ✅ 1.10× |
| REV 2 texture swaps in both panes (no cache collision) | ✅ |
| Approve → exports gated to approved state | ✅ |
| AuditTrail JSON downloads, schema-valid, human-readable | ✅ inspected |
| GLB downloads, binary glTF v2 with embedded label texture | ✅ `file` verified |
| Orbit / zoom via CameraControls | ✅ |

Covered by unit tests rather than the browser run: the **OTHER** category
path (texture re-run, transform untouched), **maxRetriesReached** after three
rejections, illegal-transition rejection. 40 tests across 9 packages.

## Known caveats

- **GLB export serialises the bottle group only** — deliberately. Exporting
  the whole scene drags drei's contact-shadow render-target texture into
  GLTFExporter, which cannot process it (this is the exact risk the plan's
  register predicted; the JSON is the primary governance artifact).
- The label wraps 360°, so its printed border appears on the back side of the
  bottle — consistent with "flat texture naively applied", which is the story.
- Dev-mode first paint compiles for a few seconds; run `yarn dev` before the
  audience arrives, or use `yarn build && yarn start` for production pacing.
- Mirrored text visible through the glass shoulder is the label's inner face
  (DoubleSide material) — physically plausible, not a bug.

## Projector insurance

`vellum-demo-loop.gif` (recorded from the verified run) shows the full loop:
idle → generate → distortion warning → structured rejection → corrected
attempt → approve → export. If the live demo dies, play the recording and
walk the audit-trail JSON instead.
